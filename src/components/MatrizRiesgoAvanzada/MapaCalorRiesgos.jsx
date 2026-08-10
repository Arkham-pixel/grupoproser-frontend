import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const VALORACIONES_VACIAS = [];
const MAPA_VACIO = {};

function riesgosIguales(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
import { FaChartBar, FaFire, FaSyncAlt } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import { MatrizMapaBloque } from './MatrizUiBlocks';
import { matrizSectionTitle, matrizTableTh } from './matrizFenixUi';
import './MapaCalorRiesgos.css';
import './matrizFenixTheme.css';

const NIVEL_KEY = {
  Crítico: 'critical',
  Alto: 'high',
  Medio: 'medium',
  Bajo: 'low',
};

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

/**
 * Mapa 5x5. Si varios riesgos caen en la misma celda, el color de la celda muestra la magnitud;
 * solo se muestra un contador compacto; la lista completa se abre en un modal al hacer clic.
 */
function MapaCalorMatriz({ riesgos, etiquetaTipo, valoraciones = [] }) {
  const { t } = useTranslation();
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
            ? t('riskMatrix.mapaUi.cellEmpty', { p: probabilidad, i: impacto })
            : n === 1
              ? t('riskMatrix.mapaUi.cellOne', {
                  label: etiquetaTipo,
                  p: probabilidad,
                  i: impacto,
                  id: riesgosEnCelda[0].id,
                })
              : n <= 2
                ? t('riskMatrix.mapaUi.cellFew', {
                    label: etiquetaTipo,
                    p: probabilidad,
                    i: impacto,
                    ids: riesgosEnCelda.map((r) => r.id).join(', '),
                  })
                : t('riskMatrix.mapaUi.cellTooltip', { p: probabilidad, i: impacto, count: n });

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
                aria-label={t('riskMatrix.mapaUi.viewRisksAria', { count: n })}
              >
                <span className="celda-riesgos-conteo-numero">{n}</span>
                <span className="celda-riesgos-conteo-etiq">{t('riskMatrix.mapaUi.risksLabel')}</span>
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
              {t('riskMatrix.mapaUi.probAxis')}
            </span>
            <span className="flex-1 text-center font-heading text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
              {t('riskMatrix.mapaUi.impactAxis')}
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
                {t('riskMatrix.mapaUi.cellTitle', {
                  p: detalleCelda.probabilidad,
                  i: detalleCelda.impacto,
                })}
                {' · '}
                {t('riskMatrix.mapaUi.cellRisks', { count: detalleCelda.lista.length })}
              </p>
              <button
                type="button"
                className="mapa-celda-modal-cerrar"
                onClick={cerrarModal}
                aria-label={t('riskMatrix.mapaUi.closeAria')}
              >
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
                    <span className="mapa-celda-calif">{t('riskMatrix.mapaUi.scoreLabel', { n: r.clasificacion })}</span>
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
function TablaResumenMapa({ titulo, riesgos, vacio }) {
  const { t } = useTranslation();
  const vacioTxt = vacio ?? t('riskMatrix.mapaUi.noData');
  return (
    <div className="tabla-resumen-mapa-block w-full max-w-[500px] mx-auto">
      <h4 className={`${matrizSectionTitle} text-center text-sm uppercase tracking-wide`}>{titulo}</h4>
      {riesgos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-3 text-center font-body text-sm text-gray-500">
          {vacioTxt}
        </p>
      ) : (
        <div className="max-h-[min(220px,40vh)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className={matrizTableTh}>{t('riskMatrix.mapaUi.risk')}</th>
                <th className={matrizTableTh}>{t('riskMatrix.mapaUi.probAxis')}</th>
                <th className={matrizTableTh}>{t('riskMatrix.mapaUi.impactAxis')}</th>
                <th className={matrizTableTh}>{t('riskMatrix.mapaUi.score')}</th>
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
  const { t } = useTranslation();
  if (!valoraciones?.length) return null;

  return (
    <div className="tabla-resumen-mapa-block tabla-leyenda-mapa-block w-full max-w-[500px] mx-auto mt-3">
      <h4 className={`${matrizSectionTitle} text-center text-sm uppercase tracking-wide`}>{titulo}</h4>
      <div className="max-h-[min(200px,35vh)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={matrizTableTh}>{t('riskMatrix.mapaUi.code')}</th>
              <th className={`${matrizTableTh} text-left`}>{t('riskMatrix.mapaUi.risk')}</th>
              <th className={matrizTableTh}>{t('riskMatrix.mapaUi.score')}</th>
              <th className={matrizTableTh}>{t('riskMatrix.mapaUi.level')}</th>
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
                    <span className={`tabla-leyenda-mapa-nivel ${nivel.clase}`}>
                      {t(`riskMatrix.level.${NIVEL_KEY[nivel.texto] || 'low'}`)}
                    </span>
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
  const { t } = useTranslation();
  const [riesgosInherentes, setRiesgosInherentes] = useState([]);
  const [riesgosResiduales, setRiesgosResiduales] = useState([]);

  const valoracion = datos.valoracion;
  const mapaCalorGuardado = datos.mapaCalor;

  const valoraciones = valoracion?.valoraciones ?? VALORACIONES_VACIAS;
  const probabilidades = valoracion?.probabilidad ?? MAPA_VACIO;
  const impactosCategoria = valoracion?.impactosCategoria ?? MAPA_VACIO;
  const probResidual = valoracion?.probResidual ?? MAPA_VACIO;
  const impactosCategoriaResidual = valoracion?.impactosCategoriaResidual ?? MAPA_VACIO;
  const impactoPlano = valoracion?.impacto ?? MAPA_VACIO;
  const impactoResidualPlano = valoracion?.impactoResidual ?? MAPA_VACIO;

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

  const actualizarRiesgosSiCambian = (setter, siguiente) => {
    setter((prev) => (riesgosIguales(prev, siguiente) ? prev : siguiente));
  };

  // Calcular riesgos inherentes desde los datos de valoración
  useEffect(() => {
    if (valoraciones.length > 0) {
      const riesgosInherentesCalculados = valoraciones.map((valoracion) => {
        const probabilidadInherente = resolverProbabilidad1a5(valoracion, probabilidades);
        const impactoInherente = resolverImpacto1a5(
          valoracion,
          valoracion.impactosCategoria,
          impactosCategoria,
          'sumImpacto',
          valoracion.impacto,
          impactoPlano
        );
        const clasificacionInherente = probabilidadInherente * impactoInherente;
        const nivelInherente = calcularNivelRiesgo(probabilidadInherente, impactoInherente);

        return {
          id: `R${valoracion.numero || valoracion.id}`,
          numero: valoracion.numero,
          probabilidad: probabilidadInherente,
          impacto: impactoInherente,
          clasificacion: clasificacionInherente,
          nivel: nivelInherente.nivel,
          color: nivelInherente.color,
          descripcion: valoracion.descripcion || '',
        };
      });

      actualizarRiesgosSiCambian(setRiesgosInherentes, riesgosInherentesCalculados);
    } else if (mapaCalorGuardado?.riesgosInherentes?.length > 0) {
      actualizarRiesgosSiCambian(setRiesgosInherentes, mapaCalorGuardado.riesgosInherentes);
    } else {
      actualizarRiesgosSiCambian(setRiesgosInherentes, VALORACIONES_VACIAS);
    }
  // Los cálculos usan los valores actuales; añadir sus funciones recreadas provocaría ejecuciones redundantes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    valoraciones,
    probabilidades,
    impactosCategoria,
    impactoPlano,
    mapaCalorGuardado?.riesgosInherentes,
  ]);

  // Calcular riesgos residuales desde los datos de valoración
  useEffect(() => {
    if (valoraciones.length > 0 && riesgosInherentes.length > 0) {
      const riesgosResidualesCalculados = valoraciones.map((valoracion) => {
        const probabilidadResidual = resolverProbabilidadResidual1a5(valoracion);
        const impactoResidual = resolverImpactoResidual1a5(valoracion);
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
          descripcion: valoracion.descripcion || '',
        };
      });

      actualizarRiesgosSiCambian(setRiesgosResiduales, riesgosResidualesCalculados);
    } else if (mapaCalorGuardado?.riesgosResiduales?.length > 0) {
      actualizarRiesgosSiCambian(setRiesgosResiduales, mapaCalorGuardado.riesgosResiduales);
    } else {
      actualizarRiesgosSiCambian(setRiesgosResiduales, VALORACIONES_VACIAS);
    }
  // Los cálculos usan los valores actuales; añadir sus funciones recreadas provocaría ejecuciones redundantes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    valoraciones,
    probResidual,
    impactosCategoriaResidual,
    probabilidades,
    impactosCategoria,
    riesgosInherentes.length,
    impactoResidualPlano,
    mapaCalorGuardado?.riesgosResiduales,
  ]);

  // Guardar datos cuando cambien
  const onDatosChangeRef = useRef(onDatosChange);
  onDatosChangeRef.current = onDatosChange;
  const ultimoMapaEnviadoRef = useRef('');

  useEffect(() => {
    if (riesgosInherentes.length === 0 && riesgosResiduales.length === 0) return;

    const payload = {
      riesgosInherentes,
      riesgosResiduales,
    };

    let serializado = '';
    try {
      serializado = JSON.stringify(payload);
    } catch {
      onDatosChangeRef.current?.(payload);
      return;
    }
    if (serializado === ultimoMapaEnviadoRef.current) return;
    ultimoMapaEnviadoRef.current = serializado;
    onDatosChangeRef.current?.(payload);
  }, [riesgosInherentes, riesgosResiduales]);


  // Componente para la tabla de riesgos
  const TablaRiesgos = ({ titulo, riesgos }) => {
    return (
      <div className="tabla-riesgos-container">
        <h3 className="tabla-titulo">{titulo}</h3>
        <div className="tabla-riesgos">
          <div className="tabla-header">
            <div className="col-riesgo">{t('riskMatrix.mapaUi.colRisk')}</div>
            <div className="col-probabilidad">{t('riskMatrix.mapaUi.colProbability')}</div>
            <div className="col-impacto">{t('riskMatrix.mapaUi.colImpact')}</div>
            <div className="col-calificacion">{t('riskMatrix.mapaUi.colScore')}</div>
          </div>
          <div className="tabla-body">
            {riesgos.map((riesgo) => (
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
        title={t('riskMatrix.mapaUi.title')}
        description={t('riskMatrix.mapaUi.description')}
        actions={
          tieneDatosReales ? (
            <>
              <button
                type="button"
                className="btn-refrescar inline-flex items-center gap-2"
                onClick={refrescarDatos}
                title={t('riskMatrix.mapaUi.refreshTitle')}
              >
                <FaSyncAlt />
                {t('riskMatrix.mapaUi.refresh')}
              </button>
              <span className="contador-riesgos">
                {t('riskMatrix.mapaUi.risksIdentified', { count: riesgosInherentes.length })}
              </span>
            </>
          ) : null
        }
      />

      {!tieneDatosReales && (
        <div className="mensaje-informativo">
          <div className="mensaje-contenido flex-1">
            <h4 className="font-heading font-bold text-gray-800 dark:text-white">
              {t('riskMatrix.mapaUi.noDataTitle')}
            </h4>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-300">
              {t('riskMatrix.mapaUi.noDataBody')}
            </p>
            <div className="mensaje-accion mt-4">
              <button type="button" className="btn-ir-valoracion inline-flex items-center gap-2">
                <FaChartBar />
                {t('riskMatrix.mapaUi.goToAssessment')}
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
                {t('riskMatrix.mapaUi.concentrationAlert', { count: riesgosInherentes.length })}
              </div>
            )}
          {/* tablas movidas encima de cada mapa */}
          <div className="tablas-wrapper tablas-wrapper--oculto" hidden aria-hidden="true">
            <div className="tabla-seccion-valoracion">
              <h4 className="tabla-seccion-titulo">{t('riskMatrix.mapaUi.inherentTitle')}</h4>
              <div className="tabla-riesgos">
                <table className="tabla-valoracion-estilo">
                  <thead>
                    <tr>
                      <th>{t('riskMatrix.mapaUi.colRisk')}</th>
                      <th>{t('riskMatrix.mapaUi.colProbability')}</th>
                      <th>{t('riskMatrix.mapaUi.colImpact')}</th>
                      <th>{t('riskMatrix.mapaUi.colScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riesgosInherentes.map((riesgo) => (
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
              <h4 className="tabla-seccion-titulo">{t('riskMatrix.mapaUi.residualTitle')}</h4>
              <div className="tabla-riesgos">
                <table className="tabla-valoracion-estilo">
                  <thead>
                    <tr>
                      <th>{t('riskMatrix.mapaUi.colRisk')}</th>
                      <th>{t('riskMatrix.mapaUi.colProbability')}</th>
                      <th>{t('riskMatrix.mapaUi.colImpact')}</th>
                      <th>{t('riskMatrix.mapaUi.colScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riesgosResiduales.map((riesgo) => (
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
            <summary className="mapa-calor-ayuda-summary">{t('riskMatrix.mapaUi.legendTitle')}</summary>
            <div className="mapa-calor-ayuda-texto">
              <p>{t('riskMatrix.mapaUi.legendBody')}</p>
            </div>
          </details>

          {/* Mapas de calor */}
          <div className="mapas-container grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
            <MatrizMapaBloque titulo={t('riskMatrix.mapaUi.inherentTitle')}>
              <TablaResumenMapa
                titulo={t('riskMatrix.mapaUi.inherentTitle')}
                riesgos={riesgosInherentes}
              />
              <MapaCalorMatriz
                riesgos={riesgosInherentes}
                etiquetaTipo={t('riskMatrix.mapaUi.inherentTitle')}
                valoraciones={valoraciones}
              />
              <TablaLeyendaMapa
                titulo={t('riskMatrix.mapaUi.inherentTitle')}
                valoraciones={valoraciones}
                riesgosMapa={riesgosInherentes}
              />
            </MatrizMapaBloque>
            <MatrizMapaBloque titulo={t('riskMatrix.mapaUi.residualTitle')}>
              <TablaResumenMapa
                titulo={t('riskMatrix.mapaUi.residualTitle')}
                riesgos={riesgosResiduales}
                vacio={t('riskMatrix.mapaUi.noResidual')}
              />
              <MapaCalorMatriz
                riesgos={riesgosResiduales}
                etiquetaTipo={t('riskMatrix.mapaUi.residualTitle')}
                valoraciones={valoraciones}
              />
              <TablaLeyendaMapa
                titulo={t('riskMatrix.mapaUi.residualTitle')}
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
