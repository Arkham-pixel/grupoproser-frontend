import React from 'react';
import { useTranslation } from 'react-i18next';
import { obtenerMetaEstadoRecomendacion } from '../gestionRiesgosHelpers';
import './reporteEjecutivo.css';

const COLORES_PRIORIDAD = {
  alta: '#dc3545',
  media: '#fd7e14',
  baja: '#28a745',
};

function TablaPrioridad({ prioridad, filas = [], t }) {
  if (!filas.length) return null;

  const prioridadKey = {
    alta: 'riskMatrix.exec.priorityHigh',
    media: 'riskMatrix.exec.priorityMedium',
    baja: 'riskMatrix.exec.priorityLow',
  }[prioridad];

  return (
    <div className="re-prioridad-bloque">
      <h3 className="re-prioridad-titulo" style={{ color: COLORES_PRIORIDAD[prioridad] }}>
        {t(prioridadKey)} ({filas.length})
      </h3>
      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('riskMatrix.exec.colRecommendation')}</th>
              <th>{t('riskMatrix.exec.colRelatedRisk')}</th>
              <th>{t('riskMatrix.exec.colProcess')}</th>
              <th>{t('riskMatrix.exec.colResidualLevel')}</th>
              <th>{t('riskMatrix.exec.colOwner')}</th>
              <th>{t('riskMatrix.exec.colTargetDate')}</th>
              <th>{t('riskMatrix.exec.colStatus')}</th>
              <th>{t('riskMatrix.exec.colProgress')}</th>
              <th>{t('riskMatrix.exec.colComment')}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((rec, index) => {
              const meta = obtenerMetaEstadoRecomendacion(rec.estado);
              const estadoLabel = meta.labelKey
                ? t(meta.labelKey)
                : rec.estadoEtiqueta || String(rec.estado || '').replace('_', ' ');
              return (
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
                  <td>{estadoLabel}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RecomendacionesPriorizadas({ analitica }) {
  const { t } = useTranslation();
  const { recomendaciones, kpis } = analitica;
  const { porPrioridad } = recomendaciones;

  return (
    <div className="re-recomendaciones">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.recTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.recDesc')}</p>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--compact">
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.notStarted')}</span>
          <strong>{kpis.recomendacionesAbiertas}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.inProgress25')}</span>
          <strong>{kpis.recomendacionesEnProceso}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.advanced75')}</span>
          <strong>{kpis.recomendacionesAvanzadas ?? 0}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.completed100')}</span>
          <strong>{kpis.recomendacionesCerradas}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>{t('riskMatrix.exec.planProgress')}</span>
          <strong>{kpis.avancePlanAccion}%</strong>
        </div>
      </div>

      <TablaPrioridad prioridad="alta" filas={porPrioridad.alta} t={t} />
      <TablaPrioridad prioridad="media" filas={porPrioridad.media} t={t} />
      <TablaPrioridad prioridad="baja" filas={porPrioridad.baja} t={t} />

      {recomendaciones.total === 0 ? (
        <p className="re-tabla-vacia re-tabla-vacia--bloque">
          {t('riskMatrix.exec.noRecommendations')}
        </p>
      ) : null}
    </div>
  );
}
