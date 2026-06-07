import React, { useState, useEffect } from 'react';
import { FaChartBar, FaFire, FaSyncAlt } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import { MatrizMapaBloque } from './MatrizUiBlocks';
import { matrizSectionTitle, matrizTableTh } from './matrizFenixUi';
import './MapaCalorRiesgos.css';
import './matrizFenixTheme.css';

/** Nivel cualitativo a partir del producto prob×impacto (misma escala que valoración). */
function obtenerNivelRiesgo(clasificacion) {
  const c = Number(clasificacion) || 0;
  if (c > 16) return { texto: 'Crítico', clase: 'nivel-critico' };
  if (c > 9) return { texto: 'Alto', clase: 'nivel-alto' };
  if (c > 4) return { texto: 'Medio', clase: 'nivel-medio' };
  return { texto: 'Bajo', clase: 'nivel-bajo' };
}

function nombreRiesgoDesdeValoracion(riesgo, valoraciones) {
  const codigo = String(riesgo?.id || '');
  const num = riesgo?.numero ?? parseInt(codigo.replace(/\D/g, ''), 10);
  const v = (valoraciones || []).find(
    (row) =>
      row?.numero === num || row?.id === riesgo?.id || `R${row?.numero}` === codigo
  );
  return (
    v?.riesgoIdentificado || v?.riesgo || v?.descripcion || riesgo?.descripcion || '—'
  );
}

function agruparRiesgosPorCelda(riesgos, minEnCelda = 3) {
  const porCelda = new Map();
  for (const r of riesgos || []) {
    const key = `${r.probabilidad}-${r.impacto}`;
    if (!porCelda.has(key)) {
      porCelda.set(key, { probabilidad: r.probabilidad, impacto: r.impacto, lista: [] });
    }
    porCelda.get(key).lista.push(r);
  }
  return [...porCelda.values()]
    .filter((g) => g.lista.length >= minEnCelda)
    .sort((a, b) => b.lista.length - a.lista.length);
}

/**
 * Mapa 5x5. Si varios riesgos caen en la misma celda, el color de la celda muestra la magnitud;
 * solo se muestra un contador compacto; la lista completa se abre en un modal al hacer clic.
 */
function MapaCalorMatriz({ riesgos, etiquetaTipo, valoraciones = [] }) {
  const [detalleCelda, setDetalleCelda] = useState(null);

  useEffect(() => {
    if (!detalleCelda) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDetalleCelda(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detalleCelda]);

  const obtenerClaseRiesgo = (probabilidad, impacto) => {
    if (impacto === 5) {
      if (probabilidad === 1) return 'yellow-risk';
      if (probabilidad === 2) return 'orange-risk';
      return 'red-risk';
    }
    if (impacto === 4) {
      if (probabilidad === 1) return 'yellow-risk';
      if (probabilidad === 2) return 'yellow-risk';
      if (probabilidad === 3) return 'orange-risk';
      return 'red-risk';
    }
    if (impacto === 3) {
      if (probabilidad === 1) return 'green-risk';
      if (probabilidad === 2) return 'yellow-risk';
      if (probabilidad === 3) return 'orange-risk';
      if (probabilidad === 4) return 'orange-risk';
      return 'red-risk';
    }
    if (impacto === 2) {
      if (probabilidad === 1) return 'green-risk';
      if (probabilidad === 2) return 'yellow-risk';
      if (probabilidad === 3) return 'yellow-risk';
      if (probabilidad === 4) return 'yellow-risk';
      return 'orange-risk';
    }
    if (impacto === 1) {
      if (probabilidad === 1) return 'green-risk';
      if (probabilidad === 2) return 'green-risk';
      if (probabilidad === 3) return 'green-risk';
      return 'yellow-risk';
    }
    return 'green-risk';
  };

  const crearGrid = () => {
    const grid = [];
    /* Filas = probabilidad (5 arriba → 1 abajo); columnas = impacto (1 izq → 5 der).
       r.probabilidad y r.impacto son los mismos valores que en Valoración (sin intercambiar). */
    for (let probabilidad = 5; probabilidad >= 1; probabilidad--) {
      const fila = [];
      for (let impacto = 1; impacto <= 5; impacto++) {
        const claseRiesgo = obtenerClaseRiesgo(probabilidad, impacto);
        const riesgosEnCelda = riesgos.filter(
          (r) => r.probabilidad === probabilidad && r.impacto === impacto
        );
        const n = riesgosEnCelda.length;

        const tituloCelda =
          n === 0
            ? `Probabilidad ${probabilidad}, Impacto ${impacto}`
            : n === 1
              ? `${etiquetaTipo}. Prob. ${probabilidad}, Imp. ${impacto} — ${riesgosEnCelda[0].id}`
              : n <= 2
                ? `${etiquetaTipo}. Prob. ${probabilidad}, Imp. ${impacto}. ${riesgosEnCelda.map((r) => r.id).join(', ')}`
                : `${etiquetaTipo}. Prob. ${probabilidad}, Imp. ${impacto}. ${n} riesgos. Clic en el número para ver la lista.`;

        fila.push(
          <div
            key={`${probabilidad}-${impacto}`}
            className={`matrix-cell ${claseRiesgo}${n > 2 ? ' matrix-cell--agrupada' : ''}`}
            title={tituloCelda}
          >
            {n === 1 && (
              <div className="celda-riesgos-marcadores celda-riesgos-marcadores--solo">
                <span className="riesgo-marcador riesgo-marcador-unico">{riesgosEnCelda[0].id}</span>
              </div>
            )}
            {n === 2 && (
              <div className="celda-riesgos-marcadores celda-riesgos-marcadores--pocos">
                {riesgosEnCelda.map((r) => (
                  <span key={r.id} className="riesgo-marcador riesgo-marcador-mini">
                    {r.id}
                  </span>
                ))}
              </div>
            )}
            {n > 2 && (
              <button
                type="button"
                className="celda-riesgos-conteo-boton"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDetalleCelda({ probabilidad, impacto, lista: riesgosEnCelda });
                }}
                aria-label={`Ver lista de ${n} riesgos, probabilidad ${probabilidad}, impacto ${impacto}`}
              >
                <span className="celda-riesgos-conteo-numero">{n}</span>
                <span className="celda-riesgos-conteo-etiq">riesgos</span>
              </button>
            )}
          </div>
        );
      }
      grid.push(
        <div key={probabilidad} className="matrix-row">
          <div className="matrix-label">{probabilidad}</div>
          {fila}
        </div>
      );
    }
    return grid;
  };

  const cerrarModal = () => setDetalleCelda(null);

  return (
    <>
      <div className="heatmap-container mx-auto max-w-[520px]">
        <div className="heatmap-matrix-fenix rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#141414]">
          <div className="mb-2 flex items-end gap-2">
            <span className="w-8 shrink-0 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Prob.
            </span>
            <span className="flex-1 text-center font-heading text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
              Impacto
            </span>
          </div>
          <div className="matrix-grid">{crearGrid()}</div>
          <div className="mt-2 flex justify-around pl-8 font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
            {[1, 2, 3, 4, 5].map((num) => (
              <span key={num} className="w-[60px] text-center">
                {num}
              </span>
            ))}
          </div>
        </div>
      </div>

      {detalleCelda && (
        <div className="mapa-celda-modal-backdrop" role="presentation" onClick={cerrarModal}>
          <div
            className="mapa-celda-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mapa-celda-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mapa-celda-modal-header">
              <h4 id="mapa-celda-modal-titulo">{etiquetaTipo}</h4>
              <p className="mapa-celda-modal-sub">
                Celda: probabilidad <strong>{detalleCelda.probabilidad}</strong>, impacto{' '}
                <strong>{detalleCelda.impacto}</strong>
                {' · '}
                <strong>{detalleCelda.lista.length}</strong> riesgos
              </p>
              <button type="button" className="mapa-celda-modal-cerrar" onClick={cerrarModal} aria-label="Cerrar">
                ×
              </button>
            </div>
            <ul className="mapa-celda-modal-lista">
              {detalleCelda.lista.map((r) => {
                const nombre = nombreRiesgoDesdeValoracion(r, valoraciones);
                return (
                  <li key={r.id}>
                    <div className="mapa-celda-modal-item">
                      <span className="mapa-celda-codigo">{r.id}</span>
                      <span className="mapa-celda-nombre" title={nombre}>
                        {nombre}
                      </span>
                    </div>
                    <span className="mapa-celda-calif">Calificación {r.clasificacion}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

/** Tabla compacta alineada al ancho del mapa 5×5 (encima de cada mapa de calor). */
function TablaResumenMapa({ titulo, riesgos, vacio = 'Sin datos' }) {
  return (
    <div className="tabla-resumen-mapa-block w-full max-w-[500px] mx-auto">
      <h4 className={`${matrizSectionTitle} text-center text-sm uppercase tracking-wide`}>{titulo}</h4>
      {riesgos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-3 text-center font-body text-sm text-gray-500">
          {vacio}
        </p>
      ) : (
        <div className="max-h-[min(220px,40vh)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className={matrizTableTh}>Riesgo</th>
                <th className={matrizTableTh}>Prob.</th>
                <th className={matrizTableTh}>Imp.</th>
                <th className={matrizTableTh}>Calif.</th>
              </tr>
            </thead>
            <tbody>
              {riesgos.map((riesgo) => (
                <tr key={riesgo.id}>
                  <td className="tabla-resumen-mapa-codigo">{riesgo.id}</td>
                  <td>{riesgo.probabilidad}</td>
                  <td>{riesgo.impacto}</td>
                  <td
                    className="tabla-resumen-mapa-calif"
                    style={{ backgroundColor: riesgo.color, color: '#fff' }}
                  >
                    {riesgo.clasificacion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Detalle por riesgo (código, nombre, calificación, nivel) alineado al ancho del mapa. */
function TablaLeyendaMapa({ titulo, valoraciones, riesgosMapa }) {
  if (!valoraciones?.length) return null;

  return (
    <div className="tabla-resumen-mapa-block tabla-leyenda-mapa-block w-full max-w-[500px] mx-auto mt-3">
      <h4 className={`${matrizSectionTitle} text-center text-sm uppercase tracking-wide`}>{titulo}</h4>
      <div className="max-h-[min(200px,35vh)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={matrizTableTh}>Cód.</th>
              <th className={`${matrizTableTh} text-left`}>Riesgo</th>
              <th className={matrizTableTh}>Calif.</th>
              <th className={matrizTableTh}>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {valoraciones.map((valoracion, index) => {
              const codigo = `R${valoracion.numero || index + 1}`;
              const nombre =
                valoracion.riesgoIdentificado ||
                valoracion.riesgo ||
                valoracion.descripcion ||
                '—';
              const riesgoCalc = riesgosMapa.find(
                (r) => r.numero === valoracion.numero || r.id === codigo
              );
              const clasificacion = riesgoCalc?.clasificacion ?? 0;
              const nivel = obtenerNivelRiesgo(clasificacion);

              return (
                <tr key={`leyenda-${codigo}`}>
                  <td className="tabla-resumen-mapa-codigo">{codigo}</td>
                  <td className="tabla-leyenda-mapa-nombre" title={nombre}>
                    {nombre}
                  </td>
                  <td className="tabla-leyenda-mapa-calif">{clasificacion}</td>
                  <td>
                    <span className={`tabla-leyenda-mapa-nivel ${nivel.clase}`}>{nivel.texto}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MapaCalorRiesgos = ({ datos, onDatosChange }) => {
  const [riesgosInherentes, setRiesgosInherentes] = useState([]);
  const [riesgosResiduales, setRiesgosResiduales] = useState([]);
  
  // Obtener datos de valoración del estado global
  const valoraciones = datos.valoracion?.valoraciones || [];
  const probabilidades = datos.valoracion?.probabilidad || {};
  const impactosCategoria = datos.valoracion?.impactosCategoria || {};
  const probResidual = datos.valoracion?.probResidual || {};
  const impactosCategoriaResidual = datos.valoracion?.impactosCategoriaResidual || {};
  /** Impacto “plano” por id (misma fuente que la tabla de Valoración) */
  const impactoPlano = datos.valoracion?.impacto || {};
  const impactoResidualPlano = datos.valoracion?.impactoResidual || {};

// Debug: Mostrar información de los datos recibidos
  useEffect(() => {
// Debug específico de valoraciones
    if (valoraciones.length > 0) {
// Debug detallado de cada valoración
      valoraciones.forEach((valoracion, index) => {
});
    } else {
}
  }, [valoraciones, probabilidades, impactosCategoria, probResidual, impactosCategoriaResidual, datos]);

  // Función para refrescar datos manualmente
  const refrescarDatos = () => {
if (onDatosChange && (riesgosInherentes.length > 0 || riesgosResiduales.length > 0)) {
      onDatosChange({
        riesgosInherentes,
        riesgosResiduales
      });
    }
  };


  // Escalas de colores para los mapas de calor
  const coloresRiesgo = {
    bajo: '#28a745',      // Verde
    medio: '#ffc107',     // Amarillo
    alto: '#fd7e14',      // Naranja
    critico: '#dc3545'    // Rojo
  };

  // Función para calcular el nivel de riesgo según probabilidad e impacto
  const calcularNivelRiesgo = (probabilidad, impacto) => {
    const clasificacion = probabilidad * impacto;
    if (clasificacion <= 4) return { nivel: 'Bajo', color: coloresRiesgo.bajo };
    if (clasificacion <= 9) return { nivel: 'Medio', color: coloresRiesgo.medio };
    if (clasificacion <= 16) return { nivel: 'Alto', color: coloresRiesgo.alto };
    return { nivel: 'Crítico', color: coloresRiesgo.critico };
  };

  // Función para calcular la suma de impactos por categoría
  const calcularSumaImpacto = (impactos) => {
    if (!impactos) return 1;
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = impactos;
    return Number(economico) + Number(operativo) + Number(reputacional) + Number(legal);
  };

  // Función para calcular el máximo impacto
  const calcularMaxImpacto = (impactos) => {
    if (!impactos) return 1;
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = impactos;
    return Math.max(Number(economico), Number(operativo), Number(reputacional), Number(legal));
  };

  // Función para convertir valor a bucket 1-5
  const bucket1a5 = (valor) => {
    const num = Number(valor) || 0;
    if (num <= 1.5) return 1;
    if (num <= 2.5) return 2;
    if (num <= 3.5) return 3;
    if (num <= 4.5) return 4;
    return 5;
  };

  /** Probabilidad 1–5: misma prioridad que la tabla (fila → mapa auxiliar). */
  const resolverProbabilidad1a5 = (valoracion, mapaAux) => {
    const desdeFila = Number(valoracion?.probabilidad);
    if (Number.isFinite(desdeFila) && desdeFila >= 1 && desdeFila <= 5) return Math.round(desdeFila);
    const desdeMapa = Number(mapaAux?.[valoracion?.id]);
    if (Number.isFinite(desdeMapa) && desdeMapa >= 1 && desdeMapa <= 5) return Math.round(desdeMapa);
    return 1;
  };

  /**
   * Impacto en escala 1–5 alineado con la columna «sumatoria impacto» de Valoración:
   * 1) sumImpacto / sumImpactoResidual en la fila; 2) impacto en fila o mapa plano; 3) máximo por categoría.
   */
  const resolverImpacto1a5 = (
    valoracion,
    categoriasEnFila,
    mapaCategorias,
    claveSumatoria,
    impactoEnFila,
    mapaImpactoPlano
  ) => {
    const cats =
      categoriasEnFila ||
      mapaCategorias?.[valoracion?.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
    const maxCat = calcularMaxImpacto(cats);
    const sumImp = Number(valoracion?.[claveSumatoria]);
    if (Number.isFinite(sumImp) && sumImp > 0) {
      if (sumImp <= 5) return Math.min(5, Math.max(1, Math.round(sumImp)));
      return bucket1a5(sumImp);
    }
    const sc = Number(
      impactoEnFila !== undefined && impactoEnFila !== null && impactoEnFila !== ''
        ? impactoEnFila
        : mapaImpactoPlano?.[valoracion?.id]
    );
    if (Number.isFinite(sc) && sc >= 1 && sc <= 5) return Math.round(sc);
    return Math.min(5, Math.max(1, Math.round(maxCat)));
  };

  const resolverProbabilidadResidual1a5 = (valoracion) => {
    const desdeFila = Number(valoracion?.probResidual);
    if (Number.isFinite(desdeFila) && desdeFila >= 1 && desdeFila <= 5) return Math.round(desdeFila);
    const desdeMapa = Number(probResidual[valoracion?.id]);
    if (Number.isFinite(desdeMapa) && desdeMapa >= 1 && desdeMapa <= 5) return Math.round(desdeMapa);
    const probFormula = bucket1a5(valoracion?.probDespues ?? valoracion?.probabilidad ?? 1);
    if (Number.isFinite(probFormula) && probFormula >= 1 && probFormula <= 5) return probFormula;
    return resolverProbabilidad1a5(valoracion, probabilidades);
  };

  /** Impacto residual 1–5: alineado con columna sumatoria (máx. categorías residual en fila/mapa). */
  const resolverImpactoResidual1a5 = (valoracion) => {
    const cats =
      valoracion?.impactosCategoriaResidual ||
      impactosCategoriaResidual[valoracion?.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
    const maxCat = calcularMaxImpacto(cats);
    const sumImp = Number(valoracion?.sumImpactoResidual);
    if (Number.isFinite(sumImp) && sumImp >= 1 && sumImp <= 5) {
      return Math.min(5, Math.max(1, Math.round(sumImp)));
    }
    const plano = Number(
      valoracion?.impactoResidual !== undefined && valoracion?.impactoResidual !== null && valoracion?.impactoResidual !== ''
        ? valoracion.impactoResidual
        : impactoResidualPlano[valoracion?.id]
    );
    if (Number.isFinite(plano) && plano >= 1 && plano <= 5) return Math.round(plano);
    return Math.min(5, Math.max(1, Math.round(maxCat)));
  };

  // Función para obtener el color de una celda del mapa de calor
  const obtenerColorCelda = (probabilidad, impacto) => {
    const nivel = calcularNivelRiesgo(probabilidad, impacto);
    return nivel.color;
  };

  // Calcular riesgos inherentes desde los datos de valoración
  useEffect(() => {
if (valoraciones.length > 0) {
const riesgosInherentesCalculados = valoraciones.map((valoracion, index) => {
// Probabilidad inherente (desde la valoración directamente)
        const probabilidadInherente = resolverProbabilidad1a5(valoracion, probabilidades);
// Impacto inherente (alineado con sumatoria / impacto de la tabla de Valoración)
        const impactosInherentes = valoracion.impactosCategoria || impactosCategoria[valoracion.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
const impactoInherente = resolverImpacto1a5(
          valoracion,
          valoracion.impactosCategoria,
          impactosCategoria,
          'sumImpacto',
          valoracion.impacto,
          impactoPlano
        );
// Clasificación inherente
        const clasificacionInherente = probabilidadInherente * impactoInherente;
        const nivelInherente = calcularNivelRiesgo(probabilidadInherente, impactoInherente);
        
        const riesgoCalculado = {
          id: `R${valoracion.numero || valoracion.id}`,
          numero: valoracion.numero,
          probabilidad: probabilidadInherente,
          impacto: impactoInherente,
          clasificacion: clasificacionInherente,
          nivel: nivelInherente.nivel,
          color: nivelInherente.color,
          descripcion: valoracion.descripcion || ''
        };
        
return riesgoCalculado;
      });
      
setRiesgosInherentes(riesgosInherentesCalculados);
    } else if (datos.riesgosInherentes && datos.riesgosInherentes.length > 0) {
setRiesgosInherentes(datos.riesgosInherentes);
    } else {
setRiesgosInherentes([]);
    }
  }, [valoraciones, probabilidades, impactosCategoria, impactoPlano]);

  // Calcular riesgos residuales desde los datos de valoración
  useEffect(() => {
    if (valoraciones.length > 0 && riesgosInherentes.length > 0) {
      const riesgosResidualesCalculados = valoraciones.map(valoracion => {
        const probabilidadResidual = resolverProbabilidadResidual1a5(valoracion);
        
        const impactoResidual = resolverImpactoResidual1a5(valoracion);
        
        // Clasificación residual
        const clasificacionResidual = probabilidadResidual * impactoResidual;
        const nivelResidual = calcularNivelRiesgo(probabilidadResidual, impactoResidual);
        
        return {
          id: `R${valoracion.numero || valoracion.id}`,
          numero: valoracion.numero,
          probabilidad: probabilidadResidual,
          impacto: impactoResidual,
          clasificacion: clasificacionResidual,
          nivel: nivelResidual.nivel,
          color: nivelResidual.color,
          descripcion: valoracion.descripcion || ''
        };
      });
      
      setRiesgosResiduales(riesgosResidualesCalculados);
    } else if (datos.riesgosResiduales && datos.riesgosResiduales.length > 0) {
      setRiesgosResiduales(datos.riesgosResiduales);
    } else {
      // NO generar datos residuales de ejemplo
      setRiesgosResiduales([]);
    }
  }, [
    valoraciones,
    probResidual,
    impactosCategoriaResidual,
    probabilidades,
    impactosCategoria,
    riesgosInherentes,
    impactoResidualPlano
  ]);

  // Sincronización automática cuando cambien los datos de valoración
  useEffect(() => {
    if (valoraciones.length > 0) {
// No llamar refrescarDatos aquí para evitar bucle infinito
      // Los useEffect de cálculo ya se ejecutan automáticamente
    }
  }, [valoraciones, probabilidades, impactosCategoria, probResidual, impactosCategoriaResidual]);

  // Guardar datos cuando cambien
  useEffect(() => {
    if (onDatosChange && (riesgosInherentes.length > 0 || riesgosResiduales.length > 0)) {
onDatosChange({
        riesgosInherentes,
        riesgosResiduales
      });
    }
  }, [riesgosInherentes, riesgosResiduales, onDatosChange]);


  // Componente para la tabla de riesgos
  const TablaRiesgos = ({ titulo, riesgos, tipo }) => {
    return (
      <div className="tabla-riesgos-container">
        <h3 className="tabla-titulo">{titulo}</h3>
        <div className="tabla-riesgos">
          <div className="tabla-header">
            <div className="col-riesgo">RIESGO</div>
            <div className="col-probabilidad">PROBABILIDAD</div>
            <div className="col-impacto">IMPACTO</div>
            <div className="col-calificacion">CALIFICACIÓN</div>
          </div>
          <div className="tabla-body">
            {riesgos.map((riesgo, index) => (
              <div key={riesgo.id} className="tabla-fila">
                <div className="col-riesgo">{riesgo.id}</div>
                <div className="col-probabilidad">{riesgo.probabilidad}</div>
                <div className="col-impacto">{riesgo.impacto}</div>
                <div 
                  className="col-calificacion"
                  style={{ backgroundColor: riesgo.color, color: 'white', fontWeight: 'bold' }}
                >
                  {riesgo.clasificacion}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Verificar si hay datos reales de valoración
  const tieneDatosReales = valoraciones.length > 0;

  return (
    <div className="mapa-calor-riesgos">
      <MatrizSeccionTitulo
        icon={FaFire}
        title="Mapa de calor de riesgos"
        description="Visualización de riesgos inherentes y residuales según probabilidad e impacto."
        actions={
          tieneDatosReales ? (
            <>
              <button
                type="button"
                className="btn-refrescar inline-flex items-center gap-2"
                onClick={refrescarDatos}
                title="Refrescar datos del mapa de calor desde la valoración"
              >
                <FaSyncAlt />
                Refrescar datos
              </button>
              <span className="contador-riesgos">
                {riesgosInherentes.length} riesgo{riesgosInherentes.length !== 1 ? 's' : ''}{' '}
                identificado{riesgosInherentes.length !== 1 ? 's' : ''}
              </span>
            </>
          ) : null
        }
      />

      {!tieneDatosReales && (
        <div className="mensaje-informativo">
          <div className="mensaje-contenido flex-1">
            <h4 className="font-heading font-bold text-gray-800 dark:text-white">
              No hay datos de valoración
            </h4>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-300">
              Para ver el mapa de calor con tus datos reales, completa primero la sección de{' '}
              <strong>Valoración</strong>. El mapa mostrará los riesgos que hayas identificado y
              valorado (R1, R2, R3, etc.).
            </p>
            <div className="mensaje-accion mt-4">
              <button type="button" className="btn-ir-valoracion inline-flex items-center gap-2">
                <FaChartBar />
                Ir a Valoración
              </button>
            </div>
          </div>
        </div>
      )}

      {tieneDatosReales && (
        <div className="mapa-calor-content">
          {riesgosInherentes.length >= 5 &&
            riesgosInherentes.every(
              (r) => Number(r.probabilidad) === 1 && Number(r.impacto) === 1
            ) && (
              <div className="mapa-calor-alerta-concentracion" role="status">
                <strong>Atención:</strong> los {riesgosInherentes.length} riesgos aparecen todos en la celda
                probabilidad 1 × impacto 1 (verde). Eso suele indicar que el mapa no está leyendo la misma
                información que la tabla de valoración (p. ej. falta guardar, o solo hay valores por defecto).
                Tras guardar la matriz, pulse <strong>Refrescar datos</strong> o vuelva a abrir la sección Valoración
                y confirme que cada fila tenga probabilidad y sumatoria de impacto distintas de 1 si corresponde.
              </div>
            )}
          {/* tablas movidas encima de cada mapa */}
          <div className="tablas-wrapper tablas-wrapper--oculto" hidden aria-hidden="true">
            <div className="tabla-seccion-valoracion">
              <h4 className="tabla-seccion-titulo">VALORACIÓN RIESGO INHERENTE</h4>
              <div className="tabla-riesgos">
                <table className="tabla-valoracion-estilo">
                  <thead>
                    <tr>
                      <th>RIESGO</th>
                      <th>PROBABILIDAD</th>
                      <th>IMPACTO</th>
                      <th>CALIFICACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riesgosInherentes.map((riesgo, index) => (
                      <tr key={riesgo.id}>
                        <td className="col-riesgo">{riesgo.id}</td>
                        <td className="col-probabilidad">{riesgo.probabilidad}</td>
                        <td className="col-impacto">{riesgo.impacto}</td>
                        <td 
                          className="col-calificacion"
                          style={{ backgroundColor: riesgo.color, color: 'white', fontWeight: 'bold' }}
                        >
                          {riesgo.clasificacion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tabla-seccion-valoracion">
              <h4 className="tabla-seccion-titulo">VALORACIÓN RIESGO RESIDUAL</h4>
              <div className="tabla-riesgos">
                <table className="tabla-valoracion-estilo">
                  <thead>
                    <tr>
                      <th>RIESGO</th>
                      <th>PROBABILIDAD</th>
                      <th>IMPACTO</th>
                      <th>CALIFICACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riesgosResiduales.map((riesgo, index) => (
                      <tr key={riesgo.id}>
                        <td className="col-riesgo">{riesgo.id}</td>
                        <td className="col-probabilidad">{riesgo.probabilidad}</td>
                        <td className="col-impacto">{riesgo.impacto}</td>
                        <td 
                          className="col-calificacion"
                          style={{ backgroundColor: riesgo.color, color: 'white', fontWeight: 'bold' }}
                        >
                          {riesgo.clasificacion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <details className="mapa-calor-ayuda-details">
            <summary className="mapa-calor-ayuda-summary">Leyenda de lectura del mapa</summary>
            <div className="mapa-calor-ayuda-texto">
              <p>
                El <strong>color</strong> de la celda indica la <strong>magnitud</strong> del riesgo. Si varios riesgos
                caen en la misma celda, verás la <strong>cantidad</strong>; pulsa el número para abrir la lista. El
                detalle por riesgo está en las <strong>tablas compactas</strong> sobre y debajo de cada mapa y en el{' '}
                <strong>informe PDF/HTML</strong>.
              </p>
            </div>
          </details>

          {/* Mapas de calor */}
          <div className="mapas-container grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
            <MatrizMapaBloque titulo="Mapa de calor — Riesgo inherente">
              <TablaResumenMapa titulo="Valoración riesgo inherente" riesgos={riesgosInherentes} />
              <MapaCalorMatriz
                riesgos={riesgosInherentes}
                etiquetaTipo="Mapa de calor — Riesgo inherente"
                valoraciones={valoraciones}
              />
              <TablaLeyendaMapa
                titulo="Identificación — inherente"
                valoraciones={valoraciones}
                riesgosMapa={riesgosInherentes}
              />
            </MatrizMapaBloque>
            <MatrizMapaBloque titulo="Mapa de calor — Riesgo residual">
              <TablaResumenMapa
                titulo="Valoración riesgo residual"
                riesgos={riesgosResiduales}
                vacio="Sin datos residuales"
              />
              <MapaCalorMatriz
                riesgos={riesgosResiduales}
                etiquetaTipo="Mapa de calor — Riesgo residual"
                valoraciones={valoraciones}
              />
              <TablaLeyendaMapa
                titulo="Identificación — residual"
                valoraciones={valoraciones}
                riesgosMapa={riesgosResiduales}
              />
            </MatrizMapaBloque>
          </div>

        </div>
      )}

    </div>
  );
};

export default MapaCalorRiesgos;
