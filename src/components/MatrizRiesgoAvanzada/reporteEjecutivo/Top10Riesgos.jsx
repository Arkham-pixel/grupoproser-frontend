import React from 'react';
import { useTranslation } from 'react-i18next';
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

function NivelBadge({ nivel, valor, t }) {
  return (
    <span
      className="re-nivel-badge"
      style={{ backgroundColor: COLORES_NIVEL[nivel] || '#6b7280' }}
    >
      {tNivel(t, nivel)} ({valor})
    </span>
  );
}

export default function Top10Riesgos({ analitica }) {
  const { t } = useTranslation();
  const { top10, kpis } = analitica;

  return (
    <div className="re-top10">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.top10Title')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.top10Desc')}</p>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--compact">
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.critical')}</span>
          <strong>{kpis.criticos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.high')}</span>
          <strong>{kpis.altos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.residualAvgShort')}</span>
          <strong>{kpis.riesgoResidualPromedio}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.reduction')}</span>
          <strong>{kpis.reduccionPromedio}%</strong>
        </div>
      </div>

      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('riskMatrix.exec.colRisk')}</th>
              <th>{t('riskMatrix.exec.colProcess')}</th>
              <th>{t('riskMatrix.exec.colCategory')}</th>
              <th>P</th>
              <th>I</th>
              <th>{t('riskMatrix.exec.colInherent')}</th>
              <th>{t('riskMatrix.exec.colResidual')}</th>
              <th>{t('riskMatrix.exec.colOwner')}</th>
              <th>{t('riskMatrix.exec.colStatus')}</th>
              <th>{t('riskMatrix.exec.colMainRec')}</th>
            </tr>
          </thead>
          <tbody>
            {top10.length === 0 ? (
              <tr>
                <td colSpan={11} className="re-tabla-vacia">
                  {t('riskMatrix.exec.noRankedRisks')}
                </td>
              </tr>
            ) : (
              top10.map((riesgo) => (
                <tr key={riesgo.id}>
                  <td>{riesgo.ranking}</td>
                  <td>{riesgo.nombre}</td>
                  <td>{riesgo.proceso}</td>
                  <td>{riesgo.categoriaPrincipal}</td>
                  <td>{riesgo.probabilidad}</td>
                  <td>{riesgo.impacto}</td>
                  <td>
                    <NivelBadge nivel={riesgo.nivelInherente} valor={riesgo.scoreInherente} t={t} />
                  </td>
                  <td>
                    <NivelBadge nivel={riesgo.nivelResidual} valor={riesgo.scoreResidual} t={t} />
                  </td>
                  <td>{riesgo.responsable || '—'}</td>
                  <td>{riesgo.estadoTratamiento}</td>
                  <td>{riesgo.recomendacionPrincipal}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
