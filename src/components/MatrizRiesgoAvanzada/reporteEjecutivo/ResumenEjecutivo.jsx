import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
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

export default function ResumenEjecutivo({ analitica }) {
  const { t } = useTranslation();
  const { kpis, resumenEjecutivo, porNivel, porProceso, semaforoCategorias, hallazgos } = analitica;

  const datosNivel = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: tNivel(t, item.nombre),
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
      raw: item.nombre,
    }));

  const topProcesos = porProceso.slice(0, 5);
  const maxProceso = topProcesos[0]?.total || 1;

  return (
    <div className="re-resumen">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.summaryTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.summaryDesc')}</p>
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

      <div className="re-kpi-grid re-kpi-grid--resumen">
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.overallLevel')}</span>
          <strong>{tNivel(t, kpis.nivelGeneral)}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.risks')}</span>
          <strong>{kpis.totalRiesgos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.critical')}</span>
          <strong>{kpis.criticos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.residualAvgShort')}</span>
          <strong>{kpis.riesgoResidualPromedio}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.reduction')}</span>
          <strong>{kpis.reduccionPromedio}%</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.openRecShort')}</span>
          <strong>{kpis.recomendacionesAbiertas}</strong>
        </div>
      </div>

      <div className="re-resumen-layout">
        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.mainConclusions')}</h3>
          <ol className="re-conclusiones-lista">
            {resumenEjecutivo.conclusiones.map((item) => (
              <li key={item.titulo}>
                <strong>{item.titulo}.</strong> {item.texto}
              </li>
            ))}
          </ol>
        </section>

        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.risksByLevel')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={datosNivel} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                {datosNivel.map((entry) => (
                  <Cell key={entry.raw} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.top5Processes')}</h3>
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
          <h3>{t('riskMatrix.exec.trafficByFront')}</h3>
          <div className="re-semaforo-lista">
            {semaforoCategorias.map((item) => (
              <div key={item.nombre} className="re-semaforo-item">
                <span
                  className="re-semaforo-punto"
                  style={{ backgroundColor: COLORES_NIVEL[item.nivel] || '#6b7280' }}
                />
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{tNivel(t, item.nivel)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="re-widget-card re-widget-card--wide">
          <h3>{t('riskMatrix.exec.nextSteps')}</h3>
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
        <h3>{t('riskMatrix.exec.analysisConclusion')}</h3>
        <p>{hallazgos.conclusion}</p>
      </section>
    </div>
  );
}
