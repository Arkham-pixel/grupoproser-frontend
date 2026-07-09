import React from 'react';
import { FaLightbulb } from 'react-icons/fa';
import './reporteEjecutivo.css';

const COLORES_NIVEL = {
  Crítico: '#dc3545',
  Alto: '#fd7e14',
  Medio: '#ffc107',
  Bajo: '#28a745',
};

function SemaforoLista({ titulo, items = [] }) {
  return (
    <section className="re-widget-card">
      <h3>{titulo}</h3>
      <div className="re-semaforo-lista">
        {items.length === 0 ? (
          <p className="re-tabla-vacia">Sin datos para mostrar.</p>
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
                  {item.nivel} · {item.totalRiesgos} riesgo(s)
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
  return (
    <div className="re-semaforo">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Semáforo gerencial</h2>
          <p className="re-seccion-desc">
            Lectura rápida por frente de riesgo y por proceso evaluado.
          </p>
        </div>
      </header>

      <div className="re-dashboard-widgets re-dashboard-widgets--2col">
        <SemaforoLista titulo="Por categoría / frente" items={analitica.semaforoCategorias} />
        <SemaforoLista titulo="Por proceso" items={analitica.semaforoProcesos} />
      </div>
    </div>
  );
}

export function HallazgosAutomaticos({ analitica }) {
  const { hallazgos, kpis } = analitica;

  return (
    <div className="re-hallazgos">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Hallazgos clave automáticos</h2>
          <p className="re-seccion-desc">
            Conclusiones generadas a partir de {kpis.totalRiesgos} riesgos evaluados.
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
        <h3>Conclusión general</h3>
        <p>{hallazgos.conclusion}</p>
      </section>
    </div>
  );
}
