import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

function WidgetDonut({ titulo, datos, centro }) {
  return (
    <section className="re-widget-card">
      <h3>{titulo}</h3>
      <div className="re-donut-wrap re-donut-wrap--chart">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={datos} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
              {datos.map((entry) => (
                <Cell key={entry.raw || entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {centro ? <p className="re-donut-centro">{centro}</p> : null}
        <div className="re-donut-leyenda">
          {datos.map((item) => (
            <div key={item.raw || item.name}>
              <span style={{ background: item.color }} />
              {item.name}: {item.value}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function GraficosEjecutivos({ analitica }) {
  const { t } = useTranslation();
  const { porProceso, porCategoria, porNivel, comparativoPorProceso, estadoRecomendaciones, procesosCriticosAltos, kpis } =
    analitica;

  const datosNivel = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: tNivel(t, item.nombre),
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
      raw: item.nombre,
    }));

  const datosCategoria = porCategoria.slice(0, 6).map((item, index) => ({
    name: item.nombre,
    value: item.total,
    color: ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'][index % 6],
  }));

  const datosComparativo = comparativoPorProceso.slice(0, 5).map((item) => ({
    proceso: item.proceso.length > 12 ? `${item.proceso.slice(0, 12)}…` : item.proceso,
    inherente: item.inherentePromedio,
    residual: item.residualPromedio,
  }));

  const datosEstadoRec = estadoRecomendaciones.map((item) => ({
    name: item.nombre,
    value: item.total,
    color: item.color,
  }));

  const topProcesos = porProceso.slice(0, 8);
  const maxProceso = topProcesos[0]?.total || 1;
  const topCriticos = procesosCriticosAltos.slice(0, 6);
  const maxCriticos = topCriticos[0]?.total || 1;

  return (
    <div className="re-graficos">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.chartsTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.chartsDesc')}</p>
        </div>
      </header>

      <div className="re-graficos-grid">
        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.chartByProcess')}</h3>
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

        <WidgetDonut
          titulo={t('riskMatrix.exec.chartByCategory')}
          datos={datosCategoria}
          centro={t('riskMatrix.exec.totalRisks', { count: kpis.totalRiesgos })}
        />

        <WidgetDonut
          titulo={t('riskMatrix.exec.chartByLevel')}
          datos={datosNivel}
          centro={t('riskMatrix.exec.avgResidual', {
            avg: kpis.riesgoResidualPromedio,
            level: tNivel(t, kpis.nivelGeneral),
          })}
        />

        <section className="re-widget-card re-widget-card--chart">
          <h3>{t('riskMatrix.exec.chartCompareTop5')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosComparativo} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="proceso" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="inherente" name={t('riskMatrix.exec.inherent')} fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="residual" name={t('riskMatrix.exec.residual')} fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="re-nota-widget">
            {t('riskMatrix.exec.reductionNote')} <strong>{kpis.reduccionPromedio}%</strong>
          </p>
        </section>

        <WidgetDonut titulo={t('riskMatrix.exec.chartRecStatus')} datos={datosEstadoRec} />

        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.chartCriticalProcesses')}</h3>
          <div className="re-barras">
            {topCriticos.length === 0 ? (
              <p className="re-tabla-vacia">{t('riskMatrix.exec.noCriticalHigh')}</p>
            ) : (
              topCriticos.map((proceso) => (
                <div key={proceso.nombre} className="re-barra-item">
                  <div className="re-barra-label">
                    <span>{proceso.nombre}</span>
                    <strong>{proceso.total}</strong>
                  </div>
                  <div className="re-barra-track">
                    <div
                      className="re-barra-fill re-barra-fill--oscuro"
                      style={{ width: `${(proceso.total / maxCriticos) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
