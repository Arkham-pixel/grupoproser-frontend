import React from 'react';
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
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Indicador de madurez en gestión de riesgos</h2>
          <p className="re-seccion-desc">
            Escala de 1 a 5 según controles, seguimiento, reducción del riesgo y avance del plan.
          </p>
        </div>
      </header>

      <div className="re-madurez-hero">
        <div className="re-madurez-nivel-actual">
          <FaShieldAlt />
          <div>
            <span>Nivel actual</span>
            <strong>
              NIVEL {madurez.nivelActual} — {madurez.nivelDetalle.nombre}
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
          <h3>Evaluación por factores</h3>
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
            Puntaje promedio de madurez: <strong>{madurez.promedioMadurez} / 5</strong>
          </p>
        </section>

        <section className="re-widget-card re-widget-card--chart">
          <h3>Radar de madurez</h3>
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
          <h3>Comparativo con períodos anteriores</h3>
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
                    name="Madurez"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="re-nota-widget">
                Evolución de madurez en {evolucion.length} períodos registrados.
              </p>
            </>
          ) : (
            <p className="re-tabla-vacia">
              El histórico se mostrará cuando existan matrices anteriores de la misma empresa.
            </p>
          )}
        </section>
      </div>

      <section className="re-madurez-acciones">
        <h3>¿Cómo avanzar al siguiente nivel?</h3>
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
              <span>Próximo nivel objetivo</span>
              <strong>
                NIVEL {madurez.proximoNivel.nivel} — {madurez.proximoNivel.nombre}
              </strong>
              <p>{madurez.proximoNivel.descripcion}</p>
            </div>
          </div>
        ) : null}
      </section>

      <p className="re-disclaimer">
        Este indicador se calcula con base en la metodología ARNALD DATA FLOW y buenas prácticas
        internacionales (ISO 31000).
      </p>
    </div>
  );
}
