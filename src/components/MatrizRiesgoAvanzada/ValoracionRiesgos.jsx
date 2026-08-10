import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChartBar } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import { matrizCard } from './matrizFenixUi';
import './ValoracionRiesgos.css';
import './matrizFenixTheme.css';
import AgregarFilaValoracion from './AgregarFilaValoracion.jsx';

const RIESGOS_IDENTIFICACION_DEFECTO = [];
const FILAS_IDENTIFICACION_DEFECTO = [];

/**
 * Filas del formulario de identificación con proceso + riesgo escrito (aun sin pasar a "Riesgos identificados").
 * Mismos ids que al confirmar con ✓: `${fila.id}-proc-${i}`.
 */
function expandirFilasFormularioAriesgos(filas) {
  const out = [];
  for (const fila of filas || []) {
    if (!fila || fila.id == null || fila.id === '') continue;
    const procesos =
      fila.procesos && fila.procesos.length > 0
        ? fila.procesos
        : fila.nombreProceso && fila.tipoProceso
          ? [{ nombre: fila.nombreProceso, tipo: fila.tipoProceso }]
          : [];
    const riesgoTxt = (fila.riesgoIdentificado || '').trim();
    if (!procesos.length || !riesgoTxt) continue;
    procesos.forEach((proceso, procIndex) => {
      out.push({
        id: `${fila.id}-proc-${procIndex}`,
        numero: fila.numero,
        nombreProceso: proceso.nombre || '',
        tipoProceso: proceso.tipo || '',
        riesgoIdentificado: riesgoTxt,
        categorias: fila.categorias || {}
      });
    });
  }
  return out;
}

/** Clave estable para emparejar el mismo riesgo aunque el id haya cambiado entre guardados. */
function claveRiesgoValoracion(r) {
  if (!r) return '';
  const proceso = (r.nombreProceso || '').trim().toLowerCase();
  const riesgo = (r.riesgoIdentificado || '').trim().toLowerCase();
  const num = r.numero != null ? String(r.numero) : '';
  return `${num}|${proceso}|${riesgo}`;
}

function deduplicarCandidatosIdentificacion(oficiales, borrador, excluidos) {
  const out = [];
  const seenIds = new Set();
  const seenClaves = new Set();
  for (const c of [...(oficiales || []), ...(borrador || [])]) {
    if (!c?.id || excluidos.has(c.id)) continue;
    const clave = claveRiesgoValoracion(c);
    if (!clave || seenIds.has(c.id) || seenClaves.has(clave)) continue;
    seenIds.add(c.id);
    seenClaves.add(clave);
    out.push(c);
  }
  return out;
}

const ValoracionRiesgos = ({
  // i18n
  datos,
  onDatosChange,
  riesgosIdentificacion = RIESGOS_IDENTIFICACION_DEFECTO,
  filasIdentificacionFormulario = FILAS_IDENTIFICACION_DEFECTO,
  modoReporte = false,
}) => {
  const { t } = useTranslation();
  // Asegurar que datos no sea undefined
  const datosSeguros = datos || {};
  const datosValoracionRef = useRef(datosSeguros);
  datosValoracionRef.current = datosSeguros;
  const [probabilidad, setProbabilidad] = useState(datosSeguros.probabilidad || {});
  const [impacto, setImpacto] = useState(datosSeguros.impacto || {});
  const [impactosCategoria, setImpactosCategoria] = useState(
    datosSeguros.impactosCategoria || {}
  );
  const [controles, setControles] = useState(datosSeguros.controles || {});
  const [probResidual, setProbResidual] = useState(datosSeguros.probResidual || {});
  const [impactoResidual, setImpactoResidual] = useState(
    datosSeguros.impactoResidual || {}
  );
  // Impactos por categoría para Residual
  const [impactosCategoriaResidual, setImpactosCategoriaResidual] = useState(
    datosSeguros.impactosCategoriaResidual || {}
  );
  const [tratamiento, setTratamiento] = useState(datosSeguros.tratamiento || {});
  const [valoraciones, setValoraciones] = useState(datosSeguros.valoraciones || []);
  const [excluidosValoracion, setExcluidosValoracion] = useState(
    () => new Set(Array.isArray(datosSeguros.excluidosValoracion) ? datosSeguros.excluidosValoracion : [])
  );
  const excluidosValoracionRef = useRef(excluidosValoracion);
  excluidosValoracionRef.current = excluidosValoracion;
  const [seleccionados, setSeleccionados] = useState(() => new Set());

  useEffect(() => {
    const idsValidos = new Set(valoraciones.map((v) => v.id).filter(Boolean));
    setSeleccionados((prev) => {
      const next = new Set([...prev].filter((id) => idsValidos.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [valoraciones]);

  // Emisor de cambios para evitar bucles: solo dispara si el payload realmente cambió
  const lastSentRef = useRef('');
  const debounceRef = useRef(null);
  const emitChange = (nextDatos) => {
    try {
      const str = JSON.stringify(nextDatos);
      if (lastSentRef.current !== str) {
        lastSentRef.current = str;
        onDatosChange(nextDatos);
      }
    } catch {
      onDatosChange(nextDatos);
    }
  };
  const emitChangeDebounced = (nextDatos, delay = 200) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => emitChange(nextDatos), delay);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  /**
   * En matrices guardadas los controles suelen vivir solo en valoracion.controles,
   * no en el mapa global `controles`. Sin esto, al editar un campo se pierden los demás.
   */
  const getControlesForRiesgo = (riesgoId, listaValoraciones = valoraciones) => {
    const enFila = listaValoraciones.find((v) => v.id === riesgoId)?.controles;
    const enMapa = controles[riesgoId];
    if (enFila && enMapa) return { ...enFila, ...enMapa };
    if (enMapa) return { ...enMapa };
    if (enFila) return { ...enFila };
    return { existen: 'No' };
  };

  /** Payload completo de valoración (evita closures obsoletos y no pierde filas al guardar). */
  const buildValoracionSnapshot = (overrides = {}) => ({
    ...datosValoracionRef.current,
    probabilidad,
    impacto,
    impactosCategoria,
    controles,
    probResidual,
    impactoResidual,
    impactosCategoriaResidual,
    tratamiento,
    valoraciones,
    excluidosValoracion: [...excluidosValoracionRef.current],
    ...overrides
  });

  const escalaProbabilidad = [
    { valor: 1, etiqueta: t('riskMatrix.probability.veryLow'), color: '#28a745' },
    { valor: 2, etiqueta: t('riskMatrix.probability.low'), color: '#6c757d' },
    { valor: 3, etiqueta: t('riskMatrix.probability.medium'), color: '#ffc107' },
    { valor: 4, etiqueta: t('riskMatrix.probability.high'), color: '#fd7e14' },
    { valor: 5, etiqueta: t('riskMatrix.probability.veryHigh'), color: '#dc3545' }
  ];

  const calcularNivelRiesgo = (prob, imp) => {
    const multiplicacion = prob * imp;
    if (multiplicacion <= 4) return { nivel: 'Bajo', color: '#28a745' };
    if (multiplicacion <= 9) return { nivel: 'Medio', color: '#ffc107' };
    if (multiplicacion <= 16) return { nivel: 'Alto', color: '#fd7e14' };
    return { nivel: 'Crítico', color: '#dc3545' };
  };

  const calcularNivelRiesgoResidual = (valoracionCuantitativa) => {
    const valor = Number(valoracionCuantitativa) || 0;
    if (valor <= 4) return { nivel: 'ACEPTABLE', color: '#28a745' };
    if (valor <= 8) return { nivel: 'TOLERABLE', color: '#ffc107' };
    if (valor <= 12) return { nivel: 'ALTO', color: '#fd7e14' };
    if (valor <= 25) return { nivel: 'CRÍTICO', color: '#dc3545' };
    return { nivel: 'CRÍTICO', color: '#dc3545' };
  };

  const calcularTratamientoSegunNivel = (nivel) => {
    switch (nivel) {
      case 'ACEPTABLE':
        return t('riskMatrix.treatment.assume');
      case 'TOLERABLE':
        return t('riskMatrix.treatment.monitor');
      case 'ALTO':
        return t('riskMatrix.treatment.reduce');
      case 'CRÍTICO':
        return t('riskMatrix.treatment.reduce');
      default:
        return t('riskMatrix.treatment.assume');
    }
  };

  const labelNivelUi = (nivel) => {
    const map = {
      Bajo: 'riskMatrix.level.low',
      Medio: 'riskMatrix.level.medium',
      Alto: 'riskMatrix.level.high',
      Crítico: 'riskMatrix.level.critical',
      ACEPTABLE: 'riskMatrix.residualLevel.acceptable',
      TOLERABLE: 'riskMatrix.residualLevel.tolerable',
      ALTO: 'riskMatrix.residualLevel.high',
      CRÍTICO: 'riskMatrix.residualLevel.critical',
    };
    return map[nivel] ? t(map[nivel]) : nivel;
  };

  const getColorByValue = (valor, tipo = 'impacto') => {
    const num = Number(valor) || 0;
    if (tipo === 'probabilidad') {
      if (num <= 1) return '#28a745'; // Verde - Muy Baja
      if (num <= 2) return '#6c757d'; // Gris - Baja
      if (num <= 3) return '#ffc107'; // Amarillo - Media
      if (num <= 4) return '#fd7e14'; // Naranja - Alta
      return '#dc3545'; // Rojo - Muy Alta
    } else { // impacto
      if (num <= 1) return '#28a745'; // Verde - Muy Bajo
      if (num <= 2) return '#6c757d'; // Gris - Bajo
      if (num <= 3) return '#ffc107'; // Amarillo - Medio
      if (num <= 4) return '#fd7e14'; // Naranja - Alto
      return '#dc3545'; // Rojo - Muy Alto
    }
  };

  const clamp15 = (n) => Math.min(5, Math.max(1, Number.isFinite(+n) ? +n : 1));
  const round2 = (n) => +(Number(n || 0).toFixed(2));

  const calcularMaxImpacto = (cat) => {
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = cat || {};
    return Math.max(Number(economico), Number(operativo), Number(reputacional), Number(legal));
  };

  const porcentajePorManuales = (estado) => {
    if (estado === 'Documentado y actualizado') return 10.5;
    if (estado === 'Parcialmente documentado') return 4.5;
    return 0;
  };

  const porcentajePorTipoControl = (tipo) => {
    if (tipo === 'Preventivo') return 15;
    if (tipo === 'Correctivo') return 7.5;
    if (tipo === 'Detectivo') return 7.5;
    return 0;
  };

  const porcentajePorAutomatizacion = (grado) => {
    const norm = (grado || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (norm === 'automatico') return 7.5;
    if (norm === 'semiautomatico') return 4.5;
    if (norm === 'manual') return 3;
    return 0;
  };

  const porcentajePorPeriodicidad = (texto) => {
    const norm = (texto || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (norm === 'diario') return 10;
    if (norm === 'semanal') return 7.5;
    if (norm === 'mensual') return 2.5;
    if (norm === 'bimensual') return 1.5;
    if (norm === 'trimestral') return 1.3;
    if (norm === 'semestral') return 1.1;
    if (norm === 'anual') return 0.8;
    if (norm === 'cuando se requiera') return 0.3;
    return 0;
  };

  const normalizaSiNo = (v) => {
    const s = (v || '').toString().toLowerCase();
    return s === 'sí' || s === 'si' ? 'Sí' : s === 'no' ? 'No' : (v || '');
  };

  // AB = 1 - Z (Z = sumatoria de controles en %). AA = E * AB
  const calcularFactorProbabilidad = (cont) => {
    const suma = Number(cont?.sumControles || 0);
    let factor = 1 - (suma / 100);
    if (factor < 0) factor = 0;
    if (factor > 1) factor = 1;
    return +factor.toFixed(4);
  };

  const recalcularProbResidual = (riesgoId, baseProb, cont) => {
    // E * AB  donde AB = 1 - Z  (Z = sumatoria de controles en %)
    const factor = calcularFactorProbabilidad(cont);
    const probDespues = round2(Number(baseProb || 0) * factor);
    const bucket = bucket1a5(probDespues);
    setProbResidual(prev => ({ ...prev, [riesgoId]: bucket }));
    setValoraciones(prev => {
      const nuevas = prev.map(v => {
        if (v.id !== riesgoId) return v;
        const sumRes = v.sumImpactoResidual || calcularSumaImpacto(v.impactosCategoriaResidual || { economico:1, operativo:1, reputacional:1, legal:1 });
        const nivel = calcularNivelRiesgo(bucket, Math.ceil((sumRes || 1)/4));
        return { ...v, probDespues, probResidual: bucket, nivelRiesgo: nivel };
      });
      emitChangeDebounced(
        buildValoracionSnapshot({
          probResidual: { ...probResidual, [riesgoId]: bucket },
          valoraciones: nuevas
        })
      );
      return nuevas;
    });
    return bucket;
  };

  const bucket1a5 = (v) => {
    const n = Number(v) || 0;
    if (n <= 1.5) return 1;
    if (n <= 2.5) return 2;
    if (n <= 3.5) return 3;
    if (n <= 4.5) return 4;
    if (n >= 4.6) return 5;
    // Cubrir hueco 4.51..4.59 como 5
    return 5;
  };

  const normalizarImpactos = (cat) => {
    const c = cat || {};
    return {
      economico: clamp15(c.economico ?? 1),
      operativo: clamp15(c.operativo ?? 1),
      reputacional: clamp15(c.reputacional ?? 1),
      legal: clamp15(c.legal ?? 1)
    };
  };

  /**
   * Excel AI: =SI(AC="Si"; AB*J ; MÁX(AE:AH))
   * J = sumatoria inherente (MAX F:I). AB = 1-Z (sumatoria % controles).
   * AE:AH siempre referencian F:I (mismas categorías); solo la sumatoria residual puede bajar.
   */
  const calcularSumatoriaImpactoResidual = (cont, sumImpactoInherente) => {
    const j = Number(sumImpactoInherente) || 1;
    if (normalizaSiNo(cont?.disminuyeImpacto) !== 'Sí') {
      return j;
    }
    return round2(j * calcularFactorProbabilidad(cont));
  };

  const recalcularMetricasResidual = (riesgoId, cont, impactosInh, sumInh) => {
    const sumRes = calcularSumatoriaImpactoResidual(cont, sumInh);
    const impactoBucket = bucket1a5(sumRes);

    setValoraciones((prevVals) => {
      const nuevas = prevVals.map((v) => {
        if (v.id !== riesgoId) return v;
        const probRes = v.probResidual || bucket1a5(v.probDespues ?? v.probabilidad ?? 1);
        const valoracionCuantitativa = probRes * impactoBucket;
        return {
          ...v,
          impactosCategoria: impactosInh,
          impactosCategoriaResidual: impactosInh,
          sumImpacto: sumInh,
          sumImpactoResidual: sumRes,
          impactoResidual: impactoBucket,
          nivelRiesgo: calcularNivelRiesgoResidual(valoracionCuantitativa)
        };
      });
      emitChangeDebounced(
        buildValoracionSnapshot({
          impactosCategoria: { ...impactosCategoria, [riesgoId]: impactosInh },
          impactosCategoriaResidual: { ...impactosCategoriaResidual, [riesgoId]: impactosInh },
          valoraciones: nuevas
        })
      );
      return nuevas;
    });
  };

  /** Categorías Econ/Oper/Rep/{t('riskMatrix.valoracionUi.legal')}: inherente = residual (como AE:AH = F:I en Excel). */
  const aplicarImpactosRiesgo = (riesgoId, impactosParcial) => {
    const fila = valoraciones.find((v) => v.id === riesgoId);
    const prev =
      impactosCategoria[riesgoId] ||
      impactosCategoriaResidual[riesgoId] ||
      fila?.impactosCategoria ||
      fila?.impactosCategoriaResidual || {
        economico: 1,
        operativo: 1,
        reputacional: 1,
        legal: 1
      };
    const actualizado = normalizarImpactos({ ...prev, ...impactosParcial });
    const sumInh = calcularMaxImpacto(actualizado);
    const cont = getControlesForRiesgo(riesgoId);

    const nuevosInh = { ...impactosCategoria, [riesgoId]: actualizado };
    const nuevosRes = { ...impactosCategoriaResidual, [riesgoId]: actualizado };
    setImpactosCategoria(nuevosInh);
    setImpactosCategoriaResidual(nuevosRes);

    recalcularMetricasResidual(riesgoId, cont, actualizado, sumInh);
  };

  const PercentInput = ({ value, onChange, min = 0, max = 100, step = 0.01 }) => (
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        className="input-num"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ paddingRight: '18px' }}
      />
      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: '11px' }}>%</span>
    </div>
  );

  const formatPct = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  // Residual: mantenemos suma para usar ceil(sum/4) en valoración cuantitativa residual
  const calcularSumaImpacto = (cat) => {
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = cat || {};
    return Number(economico) + Number(operativo) + Number(reputacional) + Number(legal);
  };

  // 1) Hidratar desde estado global si ya existen (p. ej. matriz guardada)
  useEffect(() => {
    const vals = datosSeguros.valoraciones;
    if (Array.isArray(vals) && vals.length > 0) {
      const impactosInh = { ...(datosSeguros.impactosCategoria || {}) };
      const impactosRes = { ...(datosSeguros.impactosCategoriaResidual || {}) };
      const valsNormalizados = vals.map((v) => {
        if (!v?.id) return v;
        const canon = normalizarImpactos(
          v.impactosCategoria || impactosInh[v.id] || v.impactosCategoriaResidual || impactosRes[v.id]
        );
        impactosInh[v.id] = canon;
        impactosRes[v.id] = canon;
        const sumInh = calcularMaxImpacto(canon);
        const cont =
          v.controles ||
          datosSeguros.controles?.[v.id] || {
            disminuyeImpacto: 'No',
            sumControles: 0
          };
        const sumRes = calcularSumatoriaImpactoResidual(cont, sumInh);
        return {
          ...v,
          impactosCategoria: canon,
          impactosCategoriaResidual: canon,
          sumImpacto: sumInh,
          sumImpactoResidual: sumRes
        };
      });
      setValoraciones(valsNormalizados);
      setImpactosCategoria(impactosInh);
      setImpactosCategoriaResidual(impactosRes);
      setControles((prev) => {
        const merged = { ...(datosSeguros.controles || {}), ...prev };
        vals.forEach((v) => {
          if (v?.id && v.controles) {
            merged[v.id] = { ...v.controles, ...(merged[v.id] || {}) };
          }
        });
        return merged;
      });
    }
    if (Array.isArray(datosSeguros.excluidosValoracion)) {
      setExcluidosValoracion(new Set(datosSeguros.excluidosValoracion));
    }
  // La hidratación se ejecuta únicamente al montar para no sobrescribir cambios del usuario.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Incorporar riesgos desde Identificación: lista confirmada + borrador del formulario (misma matriz).
  //    Actualiza texto proceso/riesgo si cambia en identificación; quita filas `-proc-` que ya no existen allí.
  //    No toca filas manuales (id val-...) ni riesgos legacy sin sufijo -proc-.
  useEffect(() => {
    const oficiales = Array.isArray(riesgosIdentificacion) ? riesgosIdentificacion : [];
    const idsOficiales = new Set(oficiales.map(r => r?.id).filter(Boolean));
    const borrador = expandirFilasFormularioAriesgos(filasIdentificacionFormulario).filter(
      r => r?.id && !idsOficiales.has(r.id)
    );
    const excluidos = excluidosValoracionRef.current;
    const candidatos = deduplicarCandidatosIdentificacion(oficiales, borrador, excluidos);
    const candidatosMap = new Map(candidatos.map((c) => [c.id, c]));
    const candidatosPorClave = new Map(
      candidatos.map((c) => [claveRiesgoValoracion(c), c])
    );
    const candidatosIds = new Set(candidatos.map((c) => c.id));

    const firmarLista = (lista) =>
      (lista || [])
        .map((x) => claveRiesgoValoracion(x))
        .filter(Boolean)
        .sort()
        .join('\u0001');
    const valoracionesGuardadas = datosValoracionRef.current.valoraciones || [];
    if (
      valoracionesGuardadas.length > 0 &&
      candidatos.length > 0 &&
      firmarLista(candidatos) === firmarLista(valoracionesGuardadas)
    ) {
      return;
    }

    if (candidatos.length === 0) {
      setValoraciones(prev => {
        const pruned = prev.filter(v => {
          if (!v?.id) return false;
          if (String(v.id).startsWith('val-')) return true;
          if (!String(v.id).includes('-proc-')) return true;
          return false;
        });
        if (pruned.length === prev.length) return prev;
        queueMicrotask(() => {
        emitChangeDebounced({
          ...datosValoracionRef.current,
          valoraciones: pruned,
          excluidosValoracion: [...excluidosValoracionRef.current],
          impactosCategoria,
          controles,
          probResidual,
          impactosCategoriaResidual,
          impactoResidual,
          tratamiento
        });
        });
        return pruned;
      });
      return;
    }

    const construirFila = (riesgo, filaExistente = null) => {
      const contDefaults = {
        existen: 'No',
        descripcion: '',
        disminuyeProbabilidad: 'No',
        tipo: '',
        valorTipoPct: 0,
        tieneManuales: 'No',
        valorManualesPct: 0,
        gradoAutomatizacion: '',
        valorAutomatizacionPct: 0,
        existeResponsable: 'No',
        cargoResponsable: '',
        valorResponsablePct: 0,
        periodicidad: '',
        valorPeriodicidadPct: 0,
        valorPct: 0,
        disminuyeImpacto: 'No',
        sumControles: 0
      };
      const cont = {
        ...contDefaults,
        ...getControlesForRiesgo(riesgo.id, filaExistente ? [filaExistente] : valoraciones)
      };
      const baseProb = probabilidad[riesgo.id] || 1;
      const probDespues = round2(baseProb * calcularFactorProbabilidad(cont));
      const probRes = bucket1a5(probDespues);
      const inh = normalizarImpactos(
        impactosCategoria[riesgo.id] ||
          filaExistente?.impactosCategoria ||
          filaExistente?.impactosCategoriaResidual ||
          impactosCategoriaResidual[riesgo.id] || {
            economico: 1,
            operativo: 1,
            reputacional: 1,
            legal: 1
          }
      );
      const resCat = inh;
      const sumInh = calcularMaxImpacto(inh);
      const sumRes = calcularSumatoriaImpactoResidual(cont, sumInh);
      const valoracionCuantitativa = (probRes || baseProb) * sumRes;
      const nivel = calcularNivelRiesgoResidual(valoracionCuantitativa);
      return {
        id: riesgo.id,
        numero: riesgo.numero,
        nombreProceso: riesgo.nombreProceso || '',
        riesgoIdentificado: riesgo.riesgoIdentificado || '',
        causasProbables: '',
        probabilidad: baseProb,
        impacto: impacto[riesgo.id] || 1,
        impactosCategoria: inh,
        sumImpacto: sumInh,
        controles: cont,
        probDespues,
        probResidual: probResidual[riesgo.id] || probRes,
        impactosCategoriaResidual: resCat,
        sumImpactoResidual: sumRes,
        impactoResidual: impactoResidual[riesgo.id] || 4,
        nivelRiesgo: nivel
      };
    };

    setValoraciones((prev) => {
      const existingIds = new Set();
      const existingClaves = new Set();

      const synced = prev.map((v) => {
        if (!v?.id) return v;
        const clave = claveRiesgoValoracion(v);
        const c = candidatosMap.get(v.id) || candidatosPorClave.get(clave);
        if (clave) existingClaves.add(clave);
        existingIds.add(v.id);

        if (!c) return v;

        const reconciliada = {
          ...v,
          id: c.id,
          nombreProceso: c.nombreProceso ?? v.nombreProceso,
          riesgoIdentificado: c.riesgoIdentificado ?? v.riesgoIdentificado,
          numero: c.numero ?? v.numero
        };
        existingIds.add(c.id);
        existingClaves.add(claveRiesgoValoracion(reconciliada));
        return reconciliada;
      });

      const toAdd = candidatos.filter((c) => {
        if (!c?.id) return false;
        const clave = claveRiesgoValoracion(c);
        return !existingIds.has(c.id) && !existingClaves.has(clave);
      });
      const nuevasFilas = toAdd.map((riesgo) => {
        const clave = claveRiesgoValoracion(riesgo);
        const existente = prev.find(
          (v) => v.id === riesgo.id || claveRiesgoValoracion(v) === clave
        );
        return construirFila(riesgo, existente);
      });

      let merged = nuevasFilas.length ? [...synced, ...nuevasFilas] : synced;

      const porClave = new Map();
      for (const v of merged) {
        if (!v?.id || excluidos.has(v.id)) continue;
        const clave = claveRiesgoValoracion(v);
        if (!clave) continue;
        const esManual = String(v.id).startsWith('val-');
        const enIdentificacion =
          candidatosIds.has(v.id) || candidatosPorClave.has(clave);
        if (!esManual && !enIdentificacion) continue;

        const anterior = porClave.get(clave);
        if (!anterior) {
          porClave.set(clave, v);
          continue;
        }
        const preferir =
          (v.causasProbables && !anterior.causasProbables) ||
          (v.controles?.descripcion && !anterior.controles?.descripcion)
            ? v
            : anterior;
        porClave.set(clave, preferir);
      }
      merged = Array.from(porClave.values()).map((v, index) => ({
        ...v,
        numero: index + 1
      }));

      const sinCambiosRelevantes =
        nuevasFilas.length === 0 &&
        merged.length === prev.length &&
        merged.every((v, i) => {
          const p = prev[i];
          return (
            p &&
            v.id === p.id &&
            v.riesgoIdentificado === p.riesgoIdentificado &&
            v.nombreProceso === p.nombreProceso &&
            v.numero === p.numero
          );
        });
      if (sinCambiosRelevantes) return prev;

      queueMicrotask(() => {
        emitChangeDebounced({
          ...datosValoracionRef.current,
          valoraciones: merged,
          excluidosValoracion: [...excluidosValoracionRef.current],
          impactosCategoria,
          controles,
          probResidual,
          impactosCategoriaResidual,
          impactoResidual,
          tratamiento
        });
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riesgosIdentificacion, filasIdentificacionFormulario]);

  const handleProbabilidadChange = (riesgoId, valor) => {
    const nuevaProbabilidad = { ...probabilidad, [riesgoId]: parseInt(valor) };
    setProbabilidad(nuevaProbabilidad);
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId 
        ? { 
            ...val, 
            probabilidad: parseInt(valor),
            nivelRiesgo: calcularNivelRiesgo(parseInt(valor), Math.ceil((val.sumImpacto || 1)/4))
          }
        : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ 
      ...datos, 
      probabilidad: nuevaProbabilidad, 
      valoraciones: nuevasValoraciones 
    });
    const cont = getControlesForRiesgo(riesgoId);
    recalcularProbResidual(riesgoId, parseInt(valor), cont);
  };

  const handleImpactoCategoriaChange = (riesgoId, campo, valor) => {
    aplicarImpactosRiesgo(riesgoId, { [campo]: parseInt(valor, 10) });
  };

  const handleControlesChange = (riesgoId, campo, valor) => {
    const prev = getControlesForRiesgo(riesgoId);
    const parseNumeric = (v) => v === '' ? '' : parseFloat(v);
    let actualizado = { ...prev, [campo]: ['valorPct','valorTipoPct','valorManualesPct','valorAutomatizacionPct','valorResponsablePct','valorPeriodicidadPct'].includes(campo) ? parseNumeric(valor) : valor };
    if (campo === 'tieneManuales') {
      actualizado.valorManualesPct = porcentajePorManuales(valor);
    }
    if (campo === 'tipo') {
      actualizado.valorTipoPct = porcentajePorTipoControl(valor);
    }
    if (campo === 'gradoAutomatizacion') {
      actualizado.valorAutomatizacionPct = porcentajePorAutomatizacion(valor);
    }
    if (campo === 'existeResponsable') {
      const val = (valor || '').toString().toLowerCase();
      const afirmativo = val === 'sí' || val === 'si';
      actualizado.valorResponsablePct = afirmativo ? 15 : 0;
    }
    if (campo === 'periodicidad') {
      actualizado.valorPeriodicidadPct = porcentajePorPeriodicidad(valor);
    }
    const m = Number(actualizado.valorManualesPct || 0);
    const t = Number(actualizado.valorTipoPct || 0);
    const a = Number(actualizado.valorAutomatizacionPct || 0);
    const r = Number(actualizado.valorResponsablePct || 0);
    const p = Number(actualizado.valorPeriodicidadPct || 0);
    actualizado.sumControles = +(m + t + a + r + p).toFixed(2);
    const nuevos = { ...controles, [riesgoId]: actualizado };
    setControles(nuevos);
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId ? { ...val, controles: actualizado } : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ ...datos, controles: nuevos, valoraciones: nuevasValoraciones });
    // Recalcular probabilidad residual cuando cambian controles
    const baseProb = probabilidad[riesgoId] || nuevasValoraciones.find(v => v.id === riesgoId)?.probabilidad || 1;
    recalcularProbResidual(riesgoId, baseProb, actualizado);
    const inh =
      impactosCategoria[riesgoId] ||
      nuevasValoraciones.find((v) => v.id === riesgoId)?.impactosCategoria ||
      { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
    const sumInh = calcularMaxImpacto(inh);
    recalcularMetricasResidual(riesgoId, actualizado, normalizarImpactos(inh), sumInh);
  };

  const handleResidualChange = (riesgoId, tipo, valor) => {
    if (tipo === 'prob') {
      const probVal = parseInt(valor, 10);
      const nuevo = { ...probResidual, [riesgoId]: probVal };
      setProbResidual(nuevo);
      const nuevas = valoraciones.map((v) => {
        if (v.id !== riesgoId) return v;
        const sumRes = v.sumImpactoResidual || calcularMaxImpacto(v.impactosCategoriaResidual || {});
        const valoracionCuantitativa = probVal * sumRes;
        return {
          ...v,
          probResidual: probVal,
          nivelRiesgo: calcularNivelRiesgoResidual(valoracionCuantitativa)
        };
      });
      setValoraciones(nuevas);
      emitChangeDebounced(buildValoracionSnapshot({ probResidual: nuevo, valoraciones: nuevas }));
    } else if (tipo === 'imp') {
      const actualizado = parseInt(valor, 10);
      const nuevos = { ...impactoResidual, [riesgoId]: actualizado };
      setImpactoResidual(nuevos);
      const nuevas = valoraciones.map((v) => {
        if (v.id !== riesgoId) return v;
        const probRes = v.probResidual || bucket1a5(v.probDespues ?? v.probabilidad ?? 1);
        const valoracionCuantitativa = probRes * actualizado;
        return {
          ...v,
          impactoResidual: actualizado,
          sumImpactoResidual: actualizado,
          nivelRiesgo: calcularNivelRiesgoResidual(valoracionCuantitativa)
        };
      });
      setValoraciones(nuevas);
      emitChangeDebounced(buildValoracionSnapshot({ impactoResidual: nuevos, valoraciones: nuevas }));
    } else {
      const clampEntrada = Object.fromEntries(
        Object.entries(valor).map(([k, v]) => [k, parseInt(v, 10)])
      );
      aplicarImpactosRiesgo(riesgoId, clampEntrada);
    }
  };

  const handleProcesoChange = (riesgoId, valor) => {
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId 
        ? { ...val, nombreProceso: valor }
        : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ 
      ...datos, 
      valoraciones: nuevasValoraciones 
    });
  };

  const handleRiesgoChange = (riesgoId, valor) => {
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId 
        ? { ...val, riesgoIdentificado: valor }
        : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ 
      ...datos, 
      valoraciones: nuevasValoraciones 
    });
  };

  const handleCausasChange = (riesgoId, valor) => {
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId 
        ? { ...val, causasProbables: valor }
        : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ 
      ...datos, 
      valoraciones: nuevasValoraciones 
    });
  };

  const getProbabilidadInfo = (valor) => {
    return escalaProbabilidad.find(p => p.valor === valor) || escalaProbabilidad[0];
  };

  const handleProcesarRiesgos = () => {
    const riesgosCompletos = valoraciones.filter(val => 
      val.nombreProceso.trim() !== '' && 
      val.riesgoIdentificado.trim() !== ''
    );

    if (riesgosCompletos.length === 0) {
      alert(t('riskMatrix.valoracionUi.alertCompleteOne'));
      return;
    }

    const resumen = {
      total: riesgosCompletos.length,
      criticos: riesgosCompletos.filter(v => v.nivelRiesgo.nivel === 'Crítico').length,
      altos: riesgosCompletos.filter(v => v.nivelRiesgo.nivel === 'Alto').length,
      medios: riesgosCompletos.filter(v => v.nivelRiesgo.nivel === 'Medio').length,
      bajos: riesgosCompletos.filter(v => v.nivelRiesgo.nivel === 'Bajo').length,
      riesgos: riesgosCompletos
    };

    // Procesar debe persistir inmediato
    emitChange({ 
      ...datos, 
      valoraciones: valoraciones,
      resumenProcesado: resumen
    });

    alert(t('riskMatrix.valoracionUi.alertProcessed', { total: resumen.total, critical: resumen.criticos, high: resumen.altos, medium: resumen.medios, low: resumen.bajos }));
  };

  const omitirClave = (obj, id) => {
    if (!obj || typeof obj !== 'object') return {};
    const { [id]: _omit, ...resto } = obj;
    return resto;
  };

  const alternarSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = (marcar) => {
    if (!marcar) {
      setSeleccionados(new Set());
      return;
    }
    setSeleccionados(new Set(valoraciones.map((v) => v.id).filter(Boolean)));
  };

  const todosSeleccionados =
    valoraciones.length > 0 && valoraciones.every((v) => seleccionados.has(v.id));
  const algunSeleccionado = seleccionados.size > 0;

  const eliminarSeleccionados = () => {
    if (seleccionados.size === 0) return;
    const n = seleccionados.size;
    const msg =
      n === 1
        ? t('riskMatrix.valoracionUi.confirmDeleteOne')
        : t('riskMatrix.valoracionUi.confirmDeleteMany', { count: n });
    if (!window.confirm(msg)) return;

    const idsEliminar = new Set(seleccionados);
    const nuevasValoraciones = valoraciones
      .filter((v) => !idsEliminar.has(v.id))
      .map((v, index) => ({ ...v, numero: index + 1 }));

    let nuevaProb = probabilidad;
    let nuevoImpacto = impacto;
    let nuevosImpactosCat = impactosCategoria;
    let nuevosControles = controles;
    let nuevaProbRes = probResidual;
    let nuevosImpactosRes = impactosCategoriaResidual;
    let nuevoImpactoRes = impactoResidual;
    let nuevoTratamiento = tratamiento;

    idsEliminar.forEach((id) => {
      nuevaProb = omitirClave(nuevaProb, id);
      nuevoImpacto = omitirClave(nuevoImpacto, id);
      nuevosImpactosCat = omitirClave(nuevosImpactosCat, id);
      nuevosControles = omitirClave(nuevosControles, id);
      nuevaProbRes = omitirClave(nuevaProbRes, id);
      nuevosImpactosRes = omitirClave(nuevosImpactosRes, id);
      nuevoImpactoRes = omitirClave(nuevoImpactoRes, id);
      nuevoTratamiento = omitirClave(nuevoTratamiento, id);
    });

    setProbabilidad(nuevaProb);
    setImpacto(nuevoImpacto);
    setImpactosCategoria(nuevosImpactosCat);
    setControles(nuevosControles);
    setProbResidual(nuevaProbRes);
    setImpactosCategoriaResidual(nuevosImpactosRes);
    setImpactoResidual(nuevoImpactoRes);
    setTratamiento(nuevoTratamiento);
    const nuevosExcluidos = new Set(excluidosValoracion);
    idsEliminar.forEach((id) => nuevosExcluidos.add(id));
    setExcluidosValoracion(nuevosExcluidos);
    setValoraciones(nuevasValoraciones);
    setSeleccionados(new Set());

    const baseDatos = datosValoracionRef.current;
    emitChange({
      ...baseDatos,
      valoraciones: nuevasValoraciones,
      excluidosValoracion: [...nuevosExcluidos],
      probabilidad: nuevaProb,
      impacto: nuevoImpacto,
      impactosCategoria: nuevosImpactosCat,
      controles: nuevosControles,
      probResidual: nuevaProbRes,
      impactosCategoriaResidual: nuevosImpactosRes,
      impactoResidual: nuevoImpactoRes,
      tratamiento: nuevoTratamiento
    });
  };

  const handleAgregarFilaValoracion = () => {
    const nuevoId = `val-${Date.now()}`;
    const nueva = {
      id: nuevoId,
      numero: (valoraciones[valoraciones.length - 1]?.numero || 0) + 1,
      nombreProceso: '',
      riesgoIdentificado: '',
      causasProbables: '',
      probabilidad: 1,
      impacto: 1,
      impactosCategoria: { economico: 1, operativo: 1, reputacional: 1, legal: 1 },
      sumImpacto: 1,
      controles: { existen: 'No' },
      probResidual: 1,
      impactosCategoriaResidual: { economico: 1, operativo: 1, reputacional: 1, legal: 1 },
      sumImpactoResidual: 1,
    };
    const nuevas = [...valoraciones, nueva];
    setValoraciones(nuevas);
    emitChangeDebounced({ ...datos, valoraciones: nuevas });
  };

  return (
    <div className="valoracion-riesgos">
      <MatrizSeccionTitulo
        icon={FaChartBar}
        title={t('riskMatrix.valoracionUi.title')}
        description={t('riskMatrix.valoracionUi.description')}
      />

      <div className="valoracion-content">
        {valoraciones.length === 0 && (
          <div className={`${matrizCard} text-center`}>
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">
              {t('riskMatrix.valoracionUi.empty')}
            </p>
          </div>
        )}
        {valoraciones.length > 0 && !modoReporte && (
          <div className="valoracion-barra-seleccion">
            <label className="valoracion-seleccion-todo">
              <input
                type="checkbox"
                className="valoracion-checkbox"
                checked={todosSeleccionados}
                ref={(el) => {
                  if (el) el.indeterminate = algunSeleccionado && !todosSeleccionados;
                }}
                onChange={(e) => seleccionarTodos(e.target.checked)}
                aria-label={t('riskMatrix.valoracionUi.selectAllAria')}
              />
              <span>
                {algunSeleccionado
                  ? t('riskMatrix.valoracionUi.selectedCount', { count: seleccionados.size })
                  : t('riskMatrix.valoracionUi.selectAll')}
              </span>
            </label>
            <button
              type="button"
              className="btn-eliminar-seleccionados"
              disabled={!algunSeleccionado}
              onClick={eliminarSeleccionados}
            >
              {t('riskMatrix.valoracionUi.deleteSelected')}
            </button>
            {algunSeleccionado && (
              <button
                type="button"
                className="btn-limpiar-seleccion"
                onClick={() => setSeleccionados(new Set())}
              >
                {t('riskMatrix.valoracionUi.clearSelection')}
              </button>
            )}
          </div>
        )}
        <div className="tabla-valoracion-container">
          <table className="tabla-valoracion">
            <thead>
              {/* 1) Fila de GRUPOS */}
              <tr className="thead-grupos">
                <th rowSpan="3" className="col-sel" title={t('riskMatrix.valoracionUi.select')}>
                  <input
                    type="checkbox"
                    className="valoracion-checkbox"
                    checked={todosSeleccionados}
                    ref={(el) => {
                      if (el) el.indeterminate = algunSeleccionado && !todosSeleccionados;
                    }}
                    onChange={(e) => seleccionarTodos(e.target.checked)}
                    aria-label={t('riskMatrix.valoracionUi.selectAllShort')}
                  />
                </th>
                <th rowSpan="3" className="col-numero">{t('riskMatrix.valoracionUi.colNo')}</th>

                {/* RIESGO */}
                <th colSpan="3" className="grupo">{t('riskMatrix.valoracionUi.groupRisk')}</th>

                {/* INHERENTE */}
                <th colSpan="7" className="grupo">{t('riskMatrix.valoracionUi.groupInherent')}</th>

                {/* CONTROLES */}
                <th colSpan="2" className="grupo">{t('riskMatrix.valoracionUi.groupControls')}</th>

                {/* divisor prob ↓ debe abarcar las 3 filas */}
                <th rowSpan="3" className="divisor">{t('riskMatrix.valoracionUi.dividerProb')}</th>

                {/* EFECTIVIDAD */}
                <th colSpan="13" className="grupo">{t('riskMatrix.valoracionUi.groupEffectiveness')}</th>

                {/* divisor impacto ↓ debe abarcar las 3 filas */}
                <th rowSpan="3" className="divisor">{t('riskMatrix.valoracionUi.dividerImpact')}</th>

                {/* RESIDUAL */}
                <th colSpan="8" className="grupo">
                  {t('riskMatrix.valoracionUi.groupResidual')}
                  <div className="subtitulo">
                    {t('riskMatrix.valoracionUi.residualSubtitle')}
                  </div>
                </th>

                {/* TRATAMIENTO */}
                <th className="grupo">{t('riskMatrix.valoracionUi.groupTreatment')}</th>
              </tr>

              {/* 2) Fila de SUBGRUPOS (todas las hojas aquí llevan rowSpan=2 excepto IMPACTO residual) */}
              <tr className="thead-subgrupos">
                {/* RIESGO */}
                <th rowSpan="2" className="col-riesgo">{t('riskMatrix.valoracionUi.colRisk')}</th>
                <th rowSpan="2" className="col-proceso">{t('riskMatrix.valoracionUi.colProcess')}</th>
                <th rowSpan="2" className="col-riesgo">{t('riskMatrix.valoracionUi.colCauses')}</th>

                {/* INHERENTE */}
                <th rowSpan="2" className="col-probabilidad">{t('riskMatrix.valoracionUi.colProbability')}</th>
                <th className="col-impacto" colSpan="4">
                  {t('riskMatrix.valoracionUi.impactScaleHeader')}
                </th>
                <th rowSpan="2" className="col-sum-impacto">
                  {t('riskMatrix.valoracionUi.impactSum')}
                </th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.rating')}</th>

                {/* CONTROLES */}
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.existControls')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.existingControls')}</th>

                {/* EFECTIVIDAD (todas hojas con rowSpan=2) */}
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.existManuals')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.valuePct')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.controlType')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.valuePct')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.automation')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.valuePct')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.existOwner')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.ownerRole')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.valuePct')}</th>
                <th rowSpan="2" className="col-controles">{t('riskMatrix.valoracionUi.frequency')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.valuePct')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.controlsSum')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.probAfterControls')}</th>

                {/* RESIDUAL (aquí solo IMPACTO tiene sub-subcolumnas) */}
                <th rowSpan="2" className="col-probabilidad">{t('riskMatrix.valoracionUi.colProbability')}</th>
                <th className="col-impacto" colSpan="4">
                  {t('riskMatrix.valoracionUi.impactScaleHeader')}
                </th>
                <th rowSpan="2" className="col-sum-impacto">{t('riskMatrix.valoracionUi.impactSum')}</th>
                <th rowSpan="2" className="col-num">{t('riskMatrix.valoracionUi.residualQuantitative')}</th>
                <th rowSpan="2" className="col-nivel">{t('riskMatrix.valoracionUi.residualQualitative')}</th>
                {/* TRATAMIENTO label */}
                <th rowSpan="2" className="col-tratamiento">{t('riskMatrix.valoracionUi.alternatives')}</th>
              </tr>

              {/* 3) Fila SOLO para sub-columnas de IMPACTO (Inherente y Residual) */}
              <tr className="thead-subcols">
                {/* Inherente */}
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.economic')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.operational')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.reputational')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.legal')}</th>
                {/* Residual */}
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.economic')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.operational')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.reputational')}</th>
                <th className="col-imp-cat">{t('riskMatrix.valoracionUi.legal')}</th>
              </tr>
            </thead>
            <tbody>
              {valoraciones.map(valoracion => {
                return (
                <tr
                  key={valoracion.id}
                  className={seleccionados.has(valoracion.id) ? 'fila-seleccionada' : ''}
                >
                  <td className="col-sel">
                    <input
                      type="checkbox"
                      className="valoracion-checkbox"
                      checked={seleccionados.has(valoracion.id)}
                      onChange={() => alternarSeleccion(valoracion.id)}
                      aria-label={t('riskMatrix.valoracionUi.selectRiskAria', { n: valoracion.numero })}
                    />
                  </td>
                  <td className="col-numero">{valoracion.numero}</td>
                  <td className="col-riesgo">
                    <textarea
                      value={valoracion.riesgoIdentificado}
                      onChange={(e) => handleRiesgoChange(valoracion.id, e.target.value)}
                      className="celda-editable riesgo-input"
                      rows="3"
                      placeholder={t('riskMatrix.valoracionUi.placeholderRisk')}
                    />
                  </td>
                  <td className="col-proceso">
                    <textarea
                      value={valoracion.nombreProceso}
                      onChange={(e) => handleProcesoChange(valoracion.id, e.target.value)}
                      className="celda-editable proceso-input"
                      rows="2"
                      placeholder={t('riskMatrix.valoracionUi.placeholderProcess')}
                    />
                  </td>
                  <td className="col-riesgo">
                    <textarea
                      value={valoracion.causasProbables}
                      onChange={(e) => handleCausasChange(valoracion.id, e.target.value)}
                      className="celda-editable"
                      rows="3"
                      placeholder={t('riskMatrix.valoracionUi.placeholderCauses')}
                    />
                  </td>
                  <td className="col-probabilidad">
                    <select
                      value={valoracion.probabilidad}
                      onChange={(e) => handleProbabilidadChange(valoracion.id, e.target.value)}
                      className="select-valoracion"
                      style={{ backgroundColor: getProbabilidadInfo(valoracion.probabilidad).color + '20' }}
                    >
                      {escalaProbabilidad.map(prob => (
                        <option key={prob.valor} value={prob.valor}>
                          {prob.valor} - {prob.etiqueta}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      value={valoracion.impactosCategoria?.economico || 1}
                      onChange={(e) => handleImpactoCategoriaChange(valoracion.id, 'economico', e.target.value)}
                      className="select-valoracion"
                    >
                      {[1,2,3,4,5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      value={valoracion.impactosCategoria?.operativo || 1}
                      onChange={(e) => handleImpactoCategoriaChange(valoracion.id, 'operativo', e.target.value)}
                      className="select-valoracion"
                    >
                      {[1,2,3,4,5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      value={valoracion.impactosCategoria?.reputacional || 1}
                      onChange={(e) => handleImpactoCategoriaChange(valoracion.id, 'reputacional', e.target.value)}
                      className="select-valoracion"
                    >
                      {[1,2,3,4,5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      value={valoracion.impactosCategoria?.legal || 1}
                      onChange={(e) => handleImpactoCategoriaChange(valoracion.id, 'legal', e.target.value)}
                      className="select-valoracion"
                    >
                      {[1,2,3,4,5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="col-sum-impacto" style={{ backgroundColor: getColorByValue(valoracion.sumImpacto, 'impacto') + '20' }}>
                    {valoracion.sumImpacto}
                  </td>
                  <td className="col-num">
                    {valoracion.probabilidad * (valoracion.sumImpacto || 1)}
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.existen || 'No'}
                      onChange={(e) => handleControlesChange(valoracion.id, 'existen', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="No">{t('riskMatrix.no')}</option>
                      <option value="Sí">{t('riskMatrix.yes')}</option>
                    </select>
                  </td>
                  <td className="col-controles">
                    <textarea
                      value={valoracion.controles?.descripcion || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'descripcion', e.target.value)}
                      className="celda-editable"
                      rows="2"
                      placeholder={t('riskMatrix.valoracionUi.placeholderControls')}
                    />
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.disminuyeProbabilidad || 'No'}
                      onChange={(e) => handleControlesChange(valoracion.id, 'disminuyeProbabilidad', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="No">{t('riskMatrix.no')}</option>
                      <option value="Sí">{t('riskMatrix.yes')}</option>
                    </select>
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.tieneManuales || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'tieneManuales', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="">{t('riskMatrix.selectPlaceholder')}</option>
                      <option value="Documentado y actualizado">{t('riskMatrix.valoracionUi.documentedUpdated')}</option>
                      <option value="Parcialmente documentado">{t('riskMatrix.valoracionUi.partiallyDocumented')}</option>
                      <option value="No documentado">{t('riskMatrix.valoracionUi.notDocumented')}</option>
                    </select>
                  </td>
                  <td className="col-num">
                    <div style={{ position: 'relative' }}>
                      <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.valorManualesPct ?? 0)} %`} />
                    </div>
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.tipo || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'tipo', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="">{t('riskMatrix.selectPlaceholder')}</option>
                      <option value="Preventivo">{t('riskMatrix.valoracionUi.preventive')}</option>
                      <option value="Detectivo">{t('riskMatrix.valoracionUi.detective')}</option>
                      <option value="Correctivo">{t('riskMatrix.valoracionUi.corrective')}</option>
                    </select>
                  </td>
                  <td className="col-num">
                    <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.valorTipoPct ?? 0)} %`} />
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.gradoAutomatizacion || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'gradoAutomatizacion', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="">{t('riskMatrix.selectPlaceholder')}</option>
                      <option value="Automático">{t('riskMatrix.valoracionUi.automatic')}</option>
                      <option value="Manual">{t('riskMatrix.valoracionUi.manual')}</option>
                      <option value="Semiautomático">{t('riskMatrix.valoracionUi.semiautomatic')}</option>
                    </select>
                  </td>
                  <td className="col-num">
                    <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.valorAutomatizacionPct ?? 0)} %`} />
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.existeResponsable || 'No'}
                      onChange={(e) => handleControlesChange(valoracion.id, 'existeResponsable', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="No">{t('riskMatrix.no')}</option>
                      <option value="Sí">{t('riskMatrix.yes')}</option>
                    </select>
                  </td>
                  <td className="col-controles">
                    <input
                      className="input-num"
                      value={valoracion.controles?.cargoResponsable || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'cargoResponsable', e.target.value)}
                    />
                  </td>
                  <td className="col-num">
                    <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.valorResponsablePct ?? 0)} %`} />
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.periodicidad || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'periodicidad', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="">{t('riskMatrix.selectPlaceholder')}</option>
                      <option value="Diario">{t('riskMatrix.valoracionUi.daily')}</option>
                      <option value="Semanal">{t('riskMatrix.valoracionUi.weekly')}</option>
                      <option value="Mensual">{t('riskMatrix.valoracionUi.monthly')}</option>
                      <option value="Bimensual">{t('riskMatrix.valoracionUi.bimonthly')}</option>
                      <option value="Trimestral">{t('riskMatrix.valoracionUi.quarterly')}</option>
                      <option value="Semestral">{t('riskMatrix.valoracionUi.semiannual')}</option>
                      <option value="Anual">{t('riskMatrix.valoracionUi.annual')}</option>
                      <option value="Cuando se Requiera">{t('riskMatrix.valoracionUi.asNeeded')}</option>
                    </select>
                  </td>
                  <td className="col-num">
                    <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.valorPeriodicidadPct ?? 0)} %`} />
                  </td>
                  <td className="col-num">
                    <input type="text" className="input-num" readOnly value={`${formatPct(valoracion.controles?.sumControles ?? 0)} %`} />
                  </td>
                  <td className="col-num">
                    <input
                      type="number"
                      className="input-num"
                      value={Number.isFinite(valoracion.probDespues) ? valoracion.probDespues : 0}
                      readOnly
                      style={{ backgroundColor: getColorByValue(valoracion.probDespues, 'probabilidad') + '20' }}
                    />
                  </td>
                  <td className="divisor">
                    <select
                      value={valoracion.controles?.disminuyeImpacto || 'No'}
                      onChange={(e) => handleControlesChange(valoracion.id, 'disminuyeImpacto', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="No">{t('riskMatrix.no')}</option>
                      <option value="Sí">{t('riskMatrix.yes')}</option>
                    </select>
                    </td>
                  {/* PROBABILIDAD residual (bucket 1..5, solo lectura) */}
                  <td className="col-num">
                    <input
                      type="number"
                      className="input-num"
                      value={valoracion.probResidual ?? valoracion.probabilidad}
                      readOnly
                    />
                  </td>
                  <td className="col-imp-cat">
                    <select
                      className="select-valoracion"
                      value={valoracion.impactosCategoriaResidual?.economico ?? 1}
                      onChange={(e) => handleResidualChange(valoracion.id, 'imp-cat', { economico: parseInt(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(v => (<option key={v} value={v}>{v}</option>))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      className="select-valoracion"
                      value={valoracion.impactosCategoriaResidual?.operativo ?? 1}
                      onChange={(e) => handleResidualChange(valoracion.id, 'imp-cat', { operativo: parseInt(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(v => (<option key={v} value={v}>{v}</option>))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      className="select-valoracion"
                      value={valoracion.impactosCategoriaResidual?.reputacional ?? 1}
                      onChange={(e) => handleResidualChange(valoracion.id, 'imp-cat', { reputacional: parseInt(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(v => (<option key={v} value={v}>{v}</option>))}
                    </select>
                  </td>
                  <td className="col-imp-cat">
                    <select
                      className="select-valoracion"
                      value={valoracion.impactosCategoriaResidual?.legal ?? 1}
                      onChange={(e) => handleResidualChange(valoracion.id, 'imp-cat', { legal: parseInt(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(v => (<option key={v} value={v}>{v}</option>))}
                    </select>
                  </td>
                  <td className="col-sum-impacto" style={{ backgroundColor: getColorByValue(valoracion.sumImpactoResidual, 'impacto') + '20' }}>
                    {Number.isInteger(valoracion.sumImpactoResidual)
                      ? valoracion.sumImpactoResidual
                      : Number(valoracion.sumImpactoResidual || 0).toLocaleString('es-CO', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}
                  </td>
                  <td className="col-num" style={{ backgroundColor: getColorByValue((valoracion.probResidual || valoracion.probabilidad) * bucket1a5(valoracion.sumImpactoResidual || 1), 'impacto') + '20' }}>
                    {(valoracion.probResidual || valoracion.probabilidad) *
                      bucket1a5(valoracion.sumImpactoResidual || 1)}
                  </td>
                  <td className="col-nivel">
                    {(() => { 
                      const valoracionCuantitativa =
                        (valoracion.probResidual || valoracion.probabilidad) *
                        bucket1a5(valoracion.sumImpactoResidual || 1);
                      const nivel = calcularNivelRiesgoResidual(valoracionCuantitativa); 
                      return (
                        <span className="badge-nivel" style={{ backgroundColor: nivel.color }}>{labelNivelUi(nivel.nivel)}</span>
                      ); 
                    })()}
                  </td>
                  <td className="col-tratamiento">
                    <input 
                      type="text" 
                      className="input-num" 
                      value={calcularTratamientoSegunNivel(valoracion.nivelRiesgo?.nivel || 'ACEPTABLE')} 
                      readOnly 
                      style={{ backgroundColor: '#f6f6f6' }}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="acciones-section">
          {!modoReporte && (
          <>
          <AgregarFilaValoracion onAgregar={handleAgregarFilaValoracion} />
          
          {valoraciones.length > 0 && (
            <div className="procesar-riesgos-section">
              <button 
                className="btn-procesar-riesgos"
                onClick={handleProcesarRiesgos}
              >
                <span className="btn-icono">⚡</span>
                {t('riskMatrix.valoracionUi.processRisks')}
              </button>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ValoracionRiesgos);