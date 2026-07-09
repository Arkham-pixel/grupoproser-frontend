import React from 'react';
import './reporteEjecutivo.css';

const COLORES_NIVEL = {
  Crítico: '#dc3545',
  Alto: '#fd7e14',
  Medio: '#ffc107',
  Bajo: '#28a745',
};

function NivelBadge({ nivel, valor }) {
  return (
    <span
      className="re-nivel-badge"
      style={{ backgroundColor: COLORES_NIVEL[nivel] || '#6b7280' }}
    >
      {nivel} ({valor})
    </span>
  );
}

export default function Top10Riesgos({ analitica }) {
  const { top10, kpis } = analitica;

  return (
    <div className="re-top10">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Top 10 riesgos prioritarios</h2>
          <p className="re-seccion-desc">
            Ordenados por nivel de riesgo residual, de mayor a menor exposición.
          </p>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--compact">
        <div className="re-kpi-mini">
          <span>Críticos</span>
          <strong>{kpis.criticos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Altos</span>
          <strong>{kpis.altos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Residual prom.</span>
          <strong>{kpis.riesgoResidualPromedio}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Reducción</span>
          <strong>{kpis.reduccionPromedio}%</strong>
        </div>
      </div>

      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Riesgo</th>
              <th>Proceso</th>
              <th>Categoría</th>
              <th>P</th>
              <th>I</th>
              <th>Inherente</th>
              <th>Residual</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Recomendación principal</th>
            </tr>
          </thead>
          <tbody>
            {top10.length === 0 ? (
              <tr>
                <td colSpan={11} className="re-tabla-vacia">
                  No hay riesgos valorados para mostrar el ranking.
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
                    <NivelBadge nivel={riesgo.nivelInherente} valor={riesgo.scoreInherente} />
                  </td>
                  <td>
                    <NivelBadge nivel={riesgo.nivelResidual} valor={riesgo.scoreResidual} />
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
