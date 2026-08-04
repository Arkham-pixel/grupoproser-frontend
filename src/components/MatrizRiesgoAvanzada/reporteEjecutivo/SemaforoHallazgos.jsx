import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaLightbulb } from 'react-icons/fa';
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

function SemaforoLista({ titulo, items = [], t }) {
  return (
    <section className="re-widget-card">
      <h3>{titulo}</h3>
      <div className="re-semaforo-lista">
        {items.length === 0 ? (
          <p className="re-tabla-vacia">{t('riskMatrix.exec.noData')}</p>
        ) : (
          items.map((item) => (
            <div key={item.nombre} className="re-semaforo-item">
              <span
                className="re-semaforo-punto"
                style={{ backgroundColor: COLORES_NIVEL[item.nivel] || '#6b7280' }}
              />
              <div>
                <strong>{item.nombre}</strong>
                <span>
                  {tNivel(t, item.nivel)} · {t('riskMatrix.exec.riskCount', { count: item.totalRiesgos })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function SemaforoGerencial({ analitica }) {
  const { t } = useTranslation();
  return (
    <div className="re-semaforo">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.trafficTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.trafficDesc')}</p>
        </div>
      </header>

      <div className="re-dashboard-widgets re-dashboard-widgets--2col">
        <SemaforoLista
          titulo={t('riskMatrix.exec.byCategory')}
          items={analitica.semaforoCategorias}
          t={t}
        />
        <SemaforoLista
          titulo={t('riskMatrix.exec.byProcess')}
          items={analitica.semaforoProcesos}
          t={t}
        />
      </div>
    </div>
  );
}

export function HallazgosAutomaticos({ analitica }) {
  const { t } = useTranslation();
  const { hallazgos, kpis } = analitica;

  return (
    <div className="re-hallazgos">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.autoFindingsTitle')}</h2>
          <p className="re-seccion-desc">
            {t('riskMatrix.exec.autoFindingsDesc', { count: kpis.totalRiesgos })}
          </p>
        </div>
      </header>

      <div className="re-hallazgos-grid">
        {hallazgos.lista.map((hallazgo, index) => (
          <article key={hallazgo.id} className="re-hallazgo-card">
            <div className="re-hallazgo-num">{index + 1}</div>
            <FaLightbulb className="re-hallazgo-icono" />
            <p>{hallazgo.texto}</p>
          </article>
        ))}
      </div>

      <section className="re-conclusion-box">
        <h3>{t('riskMatrix.exec.generalConclusion')}</h3>
        <p>{hallazgos.conclusion}</p>
      </section>
    </div>
  );
}
