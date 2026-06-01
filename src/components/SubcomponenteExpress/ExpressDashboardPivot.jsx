import React, { useState } from 'react';
import { esEstadoComplex } from './expressDashboardStats.js';
import {
  pivotRowEven,
  pivotRowOdd,
  pivotShell,
  pivotSubtotalRow,
  pivotThead,
  pivotTh,
  pivotTitleAnio,
  pivotTitleAnioAccent,
  pivotTitleHito,
  pivotTitleMes,
  pivotTitleMesText,
  pivotTotalRow,
} from './expressFenixUi.js';

function PivotTableShell({ title, titleVariant = 'mes', children, empty }) {
  const titleBar =
    titleVariant === 'anio'
      ? pivotTitleAnio
      : titleVariant === 'hito'
        ? pivotTitleHito
        : pivotTitleMes;
  const titleAccent =
    titleVariant === 'anio'
      ? pivotTitleAnioAccent
      : titleVariant === 'hito'
        ? 'border-l-[3px] border-fenix-info pl-2'
        : 'border-l-[3px] border-fenix-primario pl-2';

  return (
    <div className={`flex flex-col ${pivotShell}`}>
      <div className={titleBar}>
        <h3 className={`${pivotTitleMesText} ${titleAccent}`}>{title}</h3>
      </div>
      <div className="max-h-[min(52vh,420px)] flex-1 overflow-auto bg-white dark:bg-[#1A1A1A]">
        {empty ? (
          <p className="p-3 font-body text-xs text-fenix-textoMedio">Sin datos</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function CeldaEstado({ estado }) {
  const destacar = esEstadoComplex(estado);
  return (
    <span className={destacar ? 'font-semibold text-fenix-primario dark:text-red-400' : ''}>
      {estado}
    </span>
  );
}

function TheadPivot({ cols }) {
  return (
    <thead className={pivotThead}>
      <tr>
        {cols.map((col) => (
          <th
            key={col.key}
            className={`${pivotTh} ${col.align === 'right' ? 'text-right' : ''}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** Tabla 1: totales por ajustador (expandible al detalle por fecha) */
export function TablaAsignacionResumenAjustador({
  datos,
  title = 'Asignación por ajustador',
}) {
  const { grupos = [], granTotal = 0 } = datos ?? {};
  const [expandidos, setExpandidos] = useState(() => new Set());
  const vacio = grupos.length === 0;

  const toggle = (ajustador) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(ajustador)) next.delete(ajustador);
      else next.add(ajustador);
      return next;
    });
  };

  return (
    <PivotTableShell title={title} titleVariant="mes" empty={vacio}>
      <table className="w-full min-w-[220px] border-collapse font-body text-xs">
        <TheadPivot
          cols={[
            { key: 'aj', label: 'Ajustador' },
            { key: 'av', label: 'Aviso siniestro' },
            { key: 'cnt', label: 'Cant.', align: 'right' },
          ]}
        />
        <tbody>
          {grupos.map((grupo, gIdx) => {
            const abierto = expandidos.has(grupo.ajustador);
            let rowIdx = 0;
            return (
              <React.Fragment key={grupo.ajustador}>
                <tr
                  className={`cursor-pointer font-semibold hover:bg-red-50/60 dark:hover:bg-red-950/15 ${
                    gIdx % 2 === 0 ? pivotRowEven : pivotRowOdd
                  }`}
                  onClick={() => toggle(grupo.ajustador)}
                >
                  <td className="px-2 py-1 text-gray-900 dark:text-gray-100">
                    <span className="mr-0.5 text-[10px] text-fenix-textoMedio">
                      {abierto ? '▼' : '▶'}
                    </span>
                    Total {grupo.ajustador}
                  </td>
                  <td className="px-2 py-1 text-fenix-textoMedio">—</td>
                  <td className="px-2 py-1 text-right tabular-nums">{grupo.total}</td>
                </tr>
                {abierto &&
                  grupo.filas.map((fila) => {
                    rowIdx += 1;
                    return (
                      <tr
                        key={`${grupo.ajustador}-${fila.fecha}`}
                        className={rowIdx % 2 === 0 ? pivotRowEven : pivotRowOdd}
                      >
                        <td className="px-2 py-0.5 pl-5" />
                        <td className="px-2 py-0.5 text-fenix-textoMedio dark:text-gray-400">
                          {fila.fecha}
                        </td>
                        <td className="px-2 py-0.5 text-right tabular-nums">{fila.cantidad}</td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            );
          })}
          <tr className={pivotTotalRow}>
            <td className="px-2 py-1.5" colSpan={2}>
              Suma total
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums">{granTotal}</td>
          </tr>
        </tbody>
      </table>
    </PivotTableShell>
  );
}

/** Tabla 2: estado por ajustador (mes) */
export function TablaEstadoPorAjustador({ datos, title = 'Estado por ajustador' }) {
  const { grupos = [], granTotal = 0 } = datos ?? {};
  const vacio = grupos.length === 0;
  let globalIdx = 0;

  return (
    <PivotTableShell title={title} titleVariant="mes" empty={vacio}>
      <table className="w-full min-w-[260px] border-collapse font-body text-xs">
        <TheadPivot
          cols={[
            { key: 'aj', label: 'Ajustador' },
            { key: 'est', label: 'Estado siniestro' },
            { key: 'cnt', label: 'Cant.', align: 'right' },
          ]}
        />
        <tbody>
          {grupos.map((grupo) => (
            <React.Fragment key={grupo.ajustador}>
              {grupo.filas.map((fila, idx) => {
                const trClass = globalIdx % 2 === 0 ? pivotRowEven : pivotRowOdd;
                globalIdx += 1;
                return (
                  <tr key={`${grupo.ajustador}-${fila.estado}`} className={trClass}>
                    <td className="whitespace-nowrap px-2 py-1 font-semibold text-gray-900 dark:text-gray-100">
                      {idx === 0 ? grupo.ajustador : ''}
                    </td>
                    <td className="px-2 py-1">
                      <CeldaEstado estado={fila.estado} />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{fila.cantidad}</td>
                  </tr>
                );
              })}
              <tr className={pivotSubtotalRow}>
                <td className="px-2 py-1" colSpan={2}>
                  Total {grupo.ajustador}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{grupo.total}</td>
              </tr>
            </React.Fragment>
          ))}
          <tr className={pivotTotalRow}>
            <td className="px-2 py-1.5" colSpan={2}>
              Suma total
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums">{granTotal}</td>
          </tr>
        </tbody>
      </table>
    </PivotTableShell>
  );
}

/** Tabla 3: estado total año */
export function TablaEstadoTotalAnio({ datos, title = 'Estado total año' }) {
  const { filas = [], granTotal = 0 } = datos ?? {};
  const vacio = filas.length === 0;

  return (
    <PivotTableShell title={title} titleVariant="anio" empty={vacio}>
      <table className="w-full min-w-[200px] border-collapse font-body text-xs">
        <TheadPivot
          cols={[
            { key: 'est', label: 'Estado casos' },
            { key: 'cnt', label: 'Cant.', align: 'right' },
          ]}
        />
        <tbody>
          {filas.map((fila, idx) => (
            <tr key={fila.estado} className={idx % 2 === 0 ? pivotRowEven : pivotRowOdd}>
              <td className="px-2 py-1">
                <CeldaEstado estado={fila.estado} />
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{fila.cantidad}</td>
            </tr>
          ))}
          <tr className={pivotTotalRow}>
            <td className="px-2 py-1.5">Suma total</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{granTotal}</td>
          </tr>
        </tbody>
      </table>
    </PivotTableShell>
  );
}

export function TablaAsignacionPorAjustador({ datos, title }) {
  return <TablaAsignacionResumenAjustador datos={datos} title={title} />;
}

export function TablaHitoPorAjustador({ titulo, datos }) {
  const { grupos = [], granTotal = 0 } = datos ?? {};
  const [expandidos, setExpandidos] = useState(() => new Set());
  const vacio = grupos.length === 0;

  const toggle = (ajustador) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(ajustador)) next.delete(ajustador);
      else next.add(ajustador);
      return next;
    });
  };

  return (
    <PivotTableShell title={titulo} titleVariant="hito" empty={vacio}>
      <table className="w-full border-collapse font-body text-xs">
        <TheadPivot
          cols={[
            { key: 'aj', label: 'Ajustador' },
            { key: 'f', label: 'Fecha' },
            { key: 'c', label: 'Cant.', align: 'right' },
          ]}
        />
        <tbody>
          {grupos.map((grupo, gIdx) => {
            const abierto = expandidos.has(grupo.ajustador);
            return (
              <React.Fragment key={grupo.ajustador}>
                <tr
                  className={`cursor-pointer font-semibold ${
                    gIdx % 2 === 0 ? pivotRowEven : pivotRowOdd
                  }`}
                  onClick={() => toggle(grupo.ajustador)}
                >
                  <td className="px-2 py-1">
                    <span className="mr-0.5 text-[10px] text-fenix-textoMedio">
                      {abierto ? '▼' : '▶'}
                    </span>
                    {grupo.ajustador}
                  </td>
                  <td className="px-2 py-1 text-fenix-textoMedio">—</td>
                  <td className="px-2 py-1 text-right">{grupo.total}</td>
                </tr>
                {abierto &&
                  grupo.filas.map((fila) => (
                    <tr key={`${grupo.ajustador}-${fila.fecha}`}>
                      <td />
                      <td className="px-2 py-0.5 text-fenix-textoMedio">{fila.fecha}</td>
                      <td className="px-2 py-0.5 text-right">{fila.cantidad}</td>
                    </tr>
                  ))}
              </React.Fragment>
            );
          })}
          <tr className={pivotTotalRow}>
            <td className="px-2 py-1" colSpan={2}>
              Suma total
            </td>
            <td className="px-2 py-1 text-right">{granTotal}</td>
          </tr>
        </tbody>
      </table>
    </PivotTableShell>
  );
}

export function TableroPivotTresColumnas({
  tablaAsignacion,
  tablaEstadoMes,
  tablaEstadoAnio,
  tituloAsignacion,
  tituloEstadoMes,
  tituloEstadoAnio,
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[min(100%,920px)] grid-cols-1 gap-3 md:min-w-[920px] md:grid-cols-3 md:items-start">
        <TablaAsignacionResumenAjustador datos={tablaAsignacion} title={tituloAsignacion} />
        <TablaEstadoPorAjustador datos={tablaEstadoMes} title={tituloEstadoMes} />
        <TablaEstadoTotalAnio datos={tablaEstadoAnio} title={tituloEstadoAnio} />
      </div>
    </div>
  );
}
