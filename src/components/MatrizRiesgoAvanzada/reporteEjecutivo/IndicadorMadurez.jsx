import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaArrowUp, FaShieldAlt } from 'react-icons/fa';
import './reporteEjecutivo.css';

export default function IndicadorMadurez({ analitica }) {
  const { t } = useTranslation();
  const { madurez, evolucion } = analitica;

  const datosRadar = madurez.factores.map((f) => ({
    factor: f.etiqueta.replace(' de Riesgos', '').replace(' y ', ' / '),
    puntaje: f.puntaje,
  }));

  const progresoNivel = ((madurez.nivelActual - 1) / 4) * 100;

  return (
    <div className="re-madurez">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.maturityTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.maturityDesc')}</p>
        </div>
      </header>

      <div className="re-madurez-hero">
        <div className="re-madurez-nivel-actual">
          <FaShieldAlt />
          <div>
            <span>{t('riskMatrix.exec.currentLevel')}</span>
            <strong>
              {t('riskMatrix.exec.levelLabel', {
                n: madurez.nivelActual,
                name: madurez.nivelDetalle.nombre,
              })}
            </strong>
            <p>{madurez.resumen}</p>
          </div>
        </div>

        <div className="re-madurez-stepper">
          {madurez.niveles.map((nivel) => (
            <div
              key={nivel.nivel}
              className={`re-madurez-paso ${nivel.nivel === madurez.nivelActual ? 're-madurez-paso--activo' : ''} ${nivel.nivel < madurez.nivelActual ? 're-madurez-paso--completado' : ''}`}
            >
              <span className="re-madurez-paso-num">{nivel.nivel}</span>
              <span className="re-madurez-paso-nombre">{nivel.nombre}</span>
            </div>
          ))}
          <div className="re-madurez-stepper-bar">
            <div className="re-madurez-stepper-fill" style={{ width: `${progresoNivel}%` }} />
          </div>
        </div>
      </div>

      <div className="re-madurez-grid">
        <section className="re-widget-card">
          <h3>{t('riskMatrix.exec.factorsEval')}</h3>
          <div className="re-factores-lista">
            {madurez.factores.map((factor) => (
              <div key={factor.id} className="re-factor-item">
                <div className="re-factor-head">
                  <span>{factor.etiqueta}</span>
                  <strong>
                    {factor.puntaje} / 5
                  </strong>
                </div>
                <div className="re-barra-track">
                  <div
                    className="re-barra-fill"
                    style={{ width: `${(factor.puntaje / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="re-nota-widget">
            {t('riskMatrix.exec.maturityAvg')} <strong>{madurez.promedioMadurez} / 5</strong>
          </p>
        </section>

        <section className="re-widget-card re-widget-card--chart">
          <h3>{t('riskMatrix.exec.maturityRadar')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={datosRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar dataKey="puntaje" stroke="#dc2626" fill="#dc2626" fillOpacity={0.35} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </section>

        <section className="re-widget-card re-widget-card--chart">
          <h3>{t('riskMatrix.exec.periodCompare')}</h3>
          {evolucion.length > 1 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolucion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="madurez"
                    name={t('riskMatrix.exec.maturity')}
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="re-nota-widget">
                {t('riskMatrix.exec.evolutionNote', { count: evolucion.length })}
              </p>
            </>
          ) : (
            <p className="re-tabla-vacia">{t('riskMatrix.exec.noHistory')}</p>
          )}
        </section>
      </div>

      <section className="re-madurez-acciones">
        <h3>{t('riskMatrix.exec.howToAdvance')}</h3>
        <div className="re-acciones-grid">
          {madurez.acciones.map((accion) => (
            <article key={accion.titulo} className="re-accion-card">
              <strong>{accion.titulo}</strong>
              <p>{accion.descripcion}</p>
            </article>
          ))}
        </div>
        {madurez.proximoNivel && madurez.nivelActual < 5 ? (
          <div className="re-proximo-nivel">
            <FaArrowUp />
            <div>
              <span>{t('riskMatrix.exec.nextLevelTarget')}</span>
              <strong>
                {t('riskMatrix.exec.levelLabel', {
                  n: madurez.proximoNivel.nivel,
                  name: madurez.proximoNivel.nombre,
                })}
              </strong>
              <p>{madurez.proximoNivel.descripcion}</p>
            </div>
          </div>
        ) : null}
      </section>

      <p className="re-disclaimer">{t('riskMatrix.exec.maturityDisclaimer')}</p>
    </div>
  );
}
