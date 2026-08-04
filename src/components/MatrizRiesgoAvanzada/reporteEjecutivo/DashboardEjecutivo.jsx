import React from 'react';
import { useTranslation } from 'react-i18next';
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

const NIVEL_KEY = {
  Crítico: 'critical',
  Alto: 'high',
  Medio: 'medium',
  Bajo: 'low',
};

function tNivel(t, nombre) {
  const key = NIVEL_KEY[nombre];
  return key ? t(`riskMatrix.level.${key}`) : nombre;
}

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
  const { t } = useTranslation();
  const { kpis, porNivel, porProceso, hallazgos } = analitica;

  const datosDonut = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: tNivel(t, item.nombre),
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
      raw: item.nombre,
    }));

  const topProcesos = porProceso.slice(0, 5);
  const maxProceso = topProcesos[0]?.total || 1;
  const hallazgoDestacado = hallazgos.lista[0];

  return (
    <div className="re-dashboard">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.dashTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.dashDesc')}</p>
        </div>
        <div className="re-nivel-general">
          <FaShieldAlt />
          <div>
            <span>{t('riskMatrix.exec.overallLevel')}</span>
            <strong style={{ color: kpis.nivelGeneralDetalle.color }}>
              {tNivel(t, kpis.nivelGeneral)}
            </strong>
          </div>
        </div>
      </header>

      <div className="re-kpi-grid">
        <KpiCard
          titulo={t('riskMatrix.exec.risksIdentified')}
          valor={kpis.totalRiesgos}
          subtitulo={t('riskMatrix.exec.totalEvaluated')}
          icono={FaTasks}
          onClick={() => onNavegar?.('graficos')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.critical')}
          valor={kpis.criticos}
          subtitulo={t('riskMatrix.exec.ofTotal', {
            pct: kpis.totalRiesgos ? Math.round((kpis.criticos / kpis.totalRiesgos) * 100) : 0,
          })}
          icono={FaExclamationTriangle}
          color="#dc3545"
          onClick={() => onNavegar?.('top10')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.high')}
          valor={kpis.altos}
          icono={FaExclamationTriangle}
          color="#fd7e14"
          onClick={() => onNavegar?.('top10')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.medium')}
          valor={kpis.medios}
          icono={FaChartBar}
          color="#ffc107"
        />
        <KpiCard
          titulo={t('riskMatrix.exec.low')}
          valor={kpis.bajos}
          icono={FaCheckCircle}
          color="#28a745"
        />
        <KpiCard
          titulo={t('riskMatrix.exec.inherentAvg')}
          valor={kpis.riesgoInherentePromedio}
          subtitulo={t('riskMatrix.exec.scale125')}
          icono={FaChartBar}
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.residualAvg')}
          valor={kpis.riesgoResidualPromedio}
          subtitulo={t('riskMatrix.exec.scale125')}
          icono={FaShieldAlt}
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.riskReduction')}
          valor={`${kpis.reduccionPromedio}%`}
          subtitulo={t('riskMatrix.exec.controlEffectiveness')}
          icono={FaArrowDown}
          color="#16a34a"
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.processesEvaluated')}
          valor={kpis.procesosEvaluados}
          icono={FaTasks}
          onClick={() => onNavegar?.('semaforo')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.documentedControls')}
          valor={kpis.controlesDocumentados}
          icono={FaShieldAlt}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.openRecommendations')}
          valor={kpis.recomendacionesAbiertas}
          icono={FaClipboardList}
          color="#dc3545"
          onClick={() => onNavegar?.('recomendaciones')}
        />
        <KpiCard
          titulo={t('riskMatrix.exec.actionPlanProgress')}
          valor={`${kpis.avancePlanAccion}%`}
          icono={FaCheckCircle}
          color="#C53030"
          onClick={() => onNavegar?.('recomendaciones')}
        />
      </div>

      <div className="re-dashboard-widgets">
        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.risksByLevel')}</h3>
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
                    <Cell key={entry.raw} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="re-donut-leyenda">
              {datosDonut.map((item) => (
                <div key={item.raw}>
                  <span style={{ background: item.color }} />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.top5Processes')}</h3>
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
          <h3>{t('riskMatrix.exec.featuredFinding')}</h3>
          {hallazgoDestacado ? (
            <p className="re-hallazgo-destacado">{hallazgoDestacado.texto}</p>
          ) : (
            <p className="re-hallazgo-destacado re-hallazgo-destacado--vacio">
              {t('riskMatrix.exec.noFindings')}
            </p>
          )}
          <button type="button" className="re-link-btn" onClick={() => onNavegar?.('hallazgos')}>
            {t('riskMatrix.exec.viewAllFindings')}
          </button>
        </section>
      </div>
    </div>
  );
}
