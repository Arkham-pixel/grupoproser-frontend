import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './reporteEjecutivo.css';

function KpiMini({ titulo, valor, subtitulo }) {
  return (
    <div className="re-kpi-mini">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      {subtitulo ? <small>{subtitulo}</small> : null}
    </div>
  );
}

export default function ComparativoInhRes({ analitica }) {
  const { kpis, comparativoPorProceso, comparativo, resumenEjecutivo } = analitica;
  const datosProceso = comparativoPorProceso.slice(0, 10).map((item) => ({
    proceso:
      item.proceso.length > 14 ? `${item.proceso.slice(0, 14)}…` : item.proceso,
    inherente: item.inherentePromedio,
    residual: item.residualPromedio,
    reduccion: item.reduccion,
  }));

  return (
    <div className="re-comparativo">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Comparativo inherente vs residual</h2>
          <p className="re-seccion-desc">
            Efectividad de los controles: cuánto disminuye el riesgo después de su aplicación.
          </p>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--compact">
        <KpiMini titulo="Inherente prom." valor={kpis.riesgoInherentePromedio} />
        <KpiMini titulo="Residual prom." valor={kpis.riesgoResidualPromedio} />
        <KpiMini titulo="Reducción prom." valor={`${kpis.reduccionPromedio}%`} />
        <KpiMini
          titulo="Mayor reducción"
          valor={
            resumenEjecutivo.mayorReduccion
              ? `${resumenEjecutivo.mayorReduccion.reduccion}%`
              : '—'
          }
          subtitulo={resumenEjecutivo.mayorReduccion?.proceso}
        />
      </div>

      <section className="re-widget-card re-widget-card--chart">
        <h3>Comparativo por proceso</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={datosProceso} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="proceso" angle={-25} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="inherente" name="Inherente" fill="#dc2626" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="residual" name="Residual" fill="#111827" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="reduccion"
              name="Reducción %"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>Riesgo</th>
              <th>Proceso</th>
              <th>Inherente</th>
              <th>Residual</th>
              <th>Reducción</th>
            </tr>
          </thead>
          <tbody>
            {comparativo.length === 0 ? (
              <tr>
                <td colSpan={5} className="re-tabla-vacia">
                  No hay datos comparativos disponibles.
                </td>
              </tr>
            ) : (
              comparativo.map((item) => (
                <tr key={`${item.nombre}-${item.proceso}`}>
                  <td>{item.nombre}</td>
                  <td>{item.proceso}</td>
                  <td>{item.inherente}</td>
                  <td>{item.residual}</td>
                  <td>{item.reduccion}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
