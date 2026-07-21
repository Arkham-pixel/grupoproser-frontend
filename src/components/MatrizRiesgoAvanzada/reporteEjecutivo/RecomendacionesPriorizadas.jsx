import React from 'react';
import './reporteEjecutivo.css';

const COLORES_PRIORIDAD = {
  alta: '#dc3545',
  media: '#fd7e14',
  baja: '#28a745',
};

const ETIQUETAS_PRIORIDAD = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
};

function TablaPrioridad({ prioridad, filas = [] }) {
  if (!filas.length) return null;

  return (
    <div className="re-prioridad-bloque">
      <h3 className="re-prioridad-titulo" style={{ color: COLORES_PRIORIDAD[prioridad] }}>
        {ETIQUETAS_PRIORIDAD[prioridad]} ({filas.length})
      </h3>
      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Recomendación</th>
              <th>Riesgo asociado</th>
              <th>Proceso</th>
              <th>Nivel residual</th>
              <th>Responsable</th>
              <th>Fecha objetivo</th>
              <th>Estado</th>
              <th>Avance</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((rec, index) => (
              <tr key={rec.id}>
                <td>{index + 1}</td>
                <td>{rec.recomendacion}</td>
                <td>{rec.riesgoAsociado}</td>
                <td>{rec.proceso || '—'}</td>
                <td>
                  {rec.nivelResidual} ({rec.scoreResidual})
                </td>
                <td>{rec.responsable || '—'}</td>
                <td>{rec.fechaObjetivo || '—'}</td>
                <td>{rec.estadoEtiqueta || rec.estado.replace('_', ' ')}</td>
                <td>
                  <div className="re-avance-cell">
                    <span>{rec.avance}%</span>
                    <div className="re-barra-track re-barra-track--mini">
                      <div className="re-barra-fill" style={{ width: `${rec.avance}%` }} />
                    </div>
                  </div>
                </td>
                <td>{rec.comentarioSeguimiento || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RecomendacionesPriorizadas({ analitica }) {
  const { recomendaciones, kpis } = analitica;
  const { porPrioridad } = recomendaciones;

  return (
    <div className="re-recomendaciones">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Recomendaciones priorizadas</h2>
          <p className="re-seccion-desc">
            Ordenadas automáticamente según nivel de riesgo residual, impacto y criticidad.
          </p>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--compact">
        <div className="re-kpi-mini">
          <span>No iniciadas (0%)</span>
          <strong>{kpis.recomendacionesAbiertas}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>En proceso (25%)</span>
          <strong>{kpis.recomendacionesEnProceso}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Avanzadas (75%)</span>
          <strong>{kpis.recomendacionesAvanzadas ?? 0}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Completadas (100%)</span>
          <strong>{kpis.recomendacionesCerradas}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Avance plan</span>
          <strong>{kpis.avancePlanAccion}%</strong>
        </div>
      </div>

      <TablaPrioridad prioridad="alta" filas={porPrioridad.alta} />
      <TablaPrioridad prioridad="media" filas={porPrioridad.media} />
      <TablaPrioridad prioridad="baja" filas={porPrioridad.baja} />

      {recomendaciones.total === 0 ? (
        <p className="re-tabla-vacia re-tabla-vacia--bloque">
          No hay recomendaciones registradas en la gestión de riesgos.
        </p>
      ) : null}
    </div>
  );
}
