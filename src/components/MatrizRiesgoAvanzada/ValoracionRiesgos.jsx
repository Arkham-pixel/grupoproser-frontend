import React, { useState, useEffect, useRef } from 'react';
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
  datos,
  onDatosChange,
  riesgosIdentificacion = RIESGOS_IDENTIFICACION_DEFECTO,
  filasIdentificacionFormulario = FILAS_IDENTIFICACION_DEFECTO
}) => {
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
    { valor: 1, etiqueta: 'Muy Baja', color: '#28a745' },
    { valor: 2, etiqueta: 'Baja', color: '#6c757d' },
    { valor: 3, etiqueta: 'Media', color: '#ffc107' },
    { valor: 4, etiqueta: 'Alta', color: '#fd7e14' },
    { valor: 5, etiqueta: 'Muy Alta', color: '#dc3545' }
  ];

  const escalaImpacto = [
    { valor: 1, etiqueta: 'Muy Bajo', color: '#28a745' },
    { valor: 2, etiqueta: 'Bajo', color: '#6c757d' },
    { valor: 3, etiqueta: 'Medio', color: '#ffc107' },
    { valor: 4, etiqueta: 'Alto', color: '#fd7e14' },
    { valor: 5, etiqueta: 'Muy Alto', color: '#dc3545' }
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
        return 'Asumir el riesgo';
      case 'TOLERABLE':
        return 'Monitorear y revisar periódicamente';
      case 'ALTO':
        return 'Reducir, evitar, transferir o compartir';
      case 'CRÍTICO':
        return 'Reducir, evitar, transferir o compartir';
      default:
        return 'Asumir el riesgo';
    }
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

  /** Categorías Econ/Oper/Rep/Legal: inherente = residual (como AE:AH = F:I en Excel). */
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

  const handleImpactoChange = (riesgoId, valor) => {
    const nuevoImpacto = { ...impacto, [riesgoId]: parseInt(valor) };
    setImpacto(nuevoImpacto);
    const nuevasValoraciones = valoraciones.map(val => 
      val.id === riesgoId 
        ? { 
            ...val, 
            impacto: parseInt(valor),
            nivelRiesgo: calcularNivelRiesgo(val.probabilidad, parseInt(valor))
          }
        : val
    );
    setValoraciones(nuevasValoraciones);
    emitChangeDebounced({ 
      ...datos, 
      impacto: nuevoImpacto, 
      valoraciones: nuevasValoraciones 
    });
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

  const handleTratamientoChange = (riesgoId, valor) => {
    const nuevo = { ...tratamiento, [riesgoId]: valor };
    setTratamiento(nuevo);
    emitChangeDebounced({ ...datos, tratamiento: nuevo });
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

  const getImpactoInfo = (valor) => {
    return escalaImpacto.find(i => i.valor === valor) || escalaImpacto[0];
  };

  const handleProcesarRiesgos = () => {
    const riesgosCompletos = valoraciones.filter(val => 
      val.nombreProceso.trim() !== '' && 
      val.riesgoIdentificado.trim() !== ''
    );

    if (riesgosCompletos.length === 0) {
      alert('Por favor, completa al menos un riesgo antes de procesar.');
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

    alert(`✅ Riesgos Procesados Exitosamente!\n\n📊 Resumen:\n• Total: ${resumen.total}\n• Críticos: ${resumen.criticos}\n• Altos: ${resumen.altos}\n• Medios: ${resumen.medios}\n• Bajos: ${resumen.bajos}\n\nLos riesgos han sido guardados y están listos para el siguiente paso.`);
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
        ? '¿Eliminar el riesgo seleccionado de la valoración?'
        : `¿Eliminar los ${n} riesgos seleccionados de la valoración?`;
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
        title="Valoración y análisis del riesgo"
        description="Evalúa probabilidad, impacto, controles y riesgo residual por cada riesgo identificado."
      />

      <div className="valoracion-content">
        {valoraciones.length === 0 && (
          <div className={`${matrizCard} text-center`}>
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">
              No hay riesgos en valoración. Completa la{' '}
              <strong>identificación</strong> y procesa el formulario para cargar filas aquí.
            </p>
          </div>
        )}
        {valoraciones.length > 0 && (
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
                aria-label="Seleccionar todos los riesgos"
              />
              <span>
                {algunSeleccionado
                  ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}`
                  : 'Seleccionar todos'}
              </span>
            </label>
            <button
              type="button"
              className="btn-eliminar-seleccionados"
              disabled={!algunSeleccionado}
              onClick={eliminarSeleccionados}
            >
              🗑️ Eliminar seleccionados
            </button>
            {algunSeleccionado && (
              <button
                type="button"
                className="btn-limpiar-seleccion"
                onClick={() => setSeleccionados(new Set())}
              >
                Quitar selección
              </button>
            )}
          </div>
        )}
        <div className="tabla-valoracion-container">
          <table className="tabla-valoracion">
            <thead>
              {/* 1) Fila de GRUPOS */}
              <tr className="thead-grupos">
                <th rowSpan="3" className="col-sel" title="Seleccionar">
                  <input
                    type="checkbox"
                    className="valoracion-checkbox"
                    checked={todosSeleccionados}
                    ref={(el) => {
                      if (el) el.indeterminate = algunSeleccionado && !todosSeleccionados;
                    }}
                    onChange={(e) => seleccionarTodos(e.target.checked)}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th rowSpan="3" className="col-numero">No.</th>

                {/* RIESGO */}
                <th colSpan="3" className="grupo">RIESGO</th>

                {/* INHERENTE */}
                <th colSpan="7" className="grupo">VALORACIÓN RIESGO INHERENTE</th>

                {/* CONTROLES */}
                <th colSpan="2" className="grupo">CONTROLES</th>

                {/* divisor prob ↓ debe abarcar las 3 filas */}
                <th rowSpan="3" className="divisor">¿Los controles disminuyen probabilidad?</th>

                {/* EFECTIVIDAD */}
                <th colSpan="13" className="grupo">EVALUACIÓN DE LA EFECTIVIDAD DE LAS MEDIDAS</th>

                {/* divisor impacto ↓ debe abarcar las 3 filas */}
                <th rowSpan="3" className="divisor">¿Los controles disminuyen impacto?</th>

                {/* RESIDUAL */}
                <th colSpan="8" className="grupo">
                  VALORACIÓN RIESGO RESIDUAL
                  <div className="subtitulo">
                    (Teniendo en cuenta los controles existentes, valore si disminuye la probabilidad y/o el impacto)
                  </div>
                </th>

                {/* TRATAMIENTO */}
                <th className="grupo">TRATAMIENTO</th>
              </tr>

              {/* 2) Fila de SUBGRUPOS (todas las hojas aquí llevan rowSpan=2 excepto IMPACTO residual) */}
              <tr className="thead-subgrupos">
                {/* RIESGO */}
                <th rowSpan="2" className="col-riesgo">RIESGO</th>
                <th rowSpan="2" className="col-proceso">PROCESO</th>
                <th rowSpan="2" className="col-riesgo">CAUSAS PROBABLES</th>

                {/* INHERENTE */}
                <th rowSpan="2" className="col-probabilidad">PROBABILIDAD</th>
                <th className="col-impacto" colSpan="4">
                  IMPACTO (1: Muy Bajo, 2: Bajo, 3: Medio, 4: Alto, 5: Muy alto)
                </th>
                <th rowSpan="2" className="col-sum-impacto">
                  SUMATORIA<br/>IMPACTO<br/>(*)
                </th>
                <th rowSpan="2" className="col-num">Calificación</th>

                {/* CONTROLES */}
                <th rowSpan="2" className="col-controles">¿Existen controles?</th>
                <th rowSpan="2" className="col-controles">Controles existentes</th>

                {/* EFECTIVIDAD (todas hojas con rowSpan=2) */}
                <th rowSpan="2" className="col-controles">¿Existen manuales, instructivos o procedimientos para el manejo del control?</th>
                <th rowSpan="2" className="col-num">Valor en %</th>
                <th rowSpan="2" className="col-controles">Tipo de control<br/>(Preventivo-Detectivo-Correctivo)</th>
                <th rowSpan="2" className="col-num">Valor en %</th>
                <th rowSpan="2" className="col-controles">Grado de automatización<br/>(Automatico,  Manual o Semiautomatico)</th>
                <th rowSpan="2" className="col-num">Valor en %</th>
                <th rowSpan="2" className="col-controles">¿Existe responsable de los controles ?</th>
                <th rowSpan="2" className="col-controles">Cargo del responsable</th>
                <th rowSpan="2" className="col-num">Valor en %</th>
                <th rowSpan="2" className="col-controles">Cada cuanto se realiza.</th>
                <th rowSpan="2" className="col-num">Valor en %</th>
                <th rowSpan="2" className="col-num">Sumatoria de controles</th>
                <th rowSpan="2" className="col-num">Probabilidad después de aplicar controles</th>

                {/* RESIDUAL (aquí solo IMPACTO tiene sub-subcolumnas) */}
                <th rowSpan="2" className="col-probabilidad">PROBABILIDAD</th>
                <th className="col-impacto" colSpan="4">
                  IMPACTO (1: Muy Bajo, 2: Bajo, 3: Medio, 4: Alto, 5: Muy alto)
                </th>
                <th rowSpan="2" className="col-sum-impacto">SUMATORIA IMPACTO (*)</th>
                <th rowSpan="2" className="col-num">Valoración cuantitativa del Riesgo residual</th>
                <th rowSpan="2" className="col-nivel">Valoración Cualitativa del riesgo residual</th>
                {/* TRATAMIENTO label */}
                <th rowSpan="2" className="col-tratamiento">Alternativas según calificación del Riesgo</th>
              </tr>

              {/* 3) Fila SOLO para sub-columnas de IMPACTO (Inherente y Residual) */}
              <tr className="thead-subcols">
                {/* Inherente */}
                <th className="col-imp-cat">Económico</th>
                <th className="col-imp-cat">Operativo</th>
                <th className="col-imp-cat">Reputacional</th>
                <th className="col-imp-cat">Legal</th>
                {/* Residual */}
                <th className="col-imp-cat">Económico</th>
                <th className="col-imp-cat">Operativo</th>
                <th className="col-imp-cat">Reputacional</th>
                <th className="col-imp-cat">Legal</th>
              </tr>
            </thead>
            <tbody>
              {valoraciones.map(valoracion => {
                const nivelRes = calcularNivelRiesgo(valoracion.probResidual || valoracion.probabilidad, (valoracion.impactoResidual || valoracion.sumImpacto));
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
                      aria-label={`Seleccionar riesgo ${valoracion.numero}`}
                    />
                  </td>
                  <td className="col-numero">{valoracion.numero}</td>
                  <td className="col-riesgo">
                    <textarea
                      value={valoracion.riesgoIdentificado}
                      onChange={(e) => handleRiesgoChange(valoracion.id, e.target.value)}
                      className="celda-editable riesgo-input"
                      rows="3"
                      placeholder="Describe el riesgo identificado..."
                    />
                  </td>
                  <td className="col-proceso">
                    <textarea
                      value={valoracion.nombreProceso}
                      onChange={(e) => handleProcesoChange(valoracion.id, e.target.value)}
                      className="celda-editable proceso-input"
                      rows="2"
                      placeholder="Nombre del proceso..."
                    />
                  </td>
                  <td className="col-riesgo">
                    <textarea
                      value={valoracion.causasProbables}
                      onChange={(e) => handleCausasChange(valoracion.id, e.target.value)}
                      className="celda-editable"
                      rows="3"
                      placeholder="Causas probables..."
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
                      <option>No</option>
                      <option>Sí</option>
                    </select>
                  </td>
                  <td className="col-controles">
                    <textarea
                      value={valoracion.controles?.descripcion || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'descripcion', e.target.value)}
                      className="celda-editable"
                      rows="2"
                      placeholder="Describe controles existentes..."
                    />
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.disminuyeProbabilidad || 'No'}
                      onChange={(e) => handleControlesChange(valoracion.id, 'disminuyeProbabilidad', e.target.value)}
                      className="select-valoracion"
                    >
                      <option>No</option>
                      <option>Sí</option>
                    </select>
                  </td>
                  <td className="col-controles">
                    <select
                      value={valoracion.controles?.tieneManuales || ''}
                      onChange={(e) => handleControlesChange(valoracion.id, 'tieneManuales', e.target.value)}
                      className="select-valoracion"
                    >
                      <option value="">Seleccione...</option>
                      <option>Documentado y actualizado</option>
                      <option>Parcialmente documentado</option>
                      <option>No documentado</option>
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
                      <option value="">Seleccione...</option>
                      <option>Preventivo</option>
                      <option>Detectivo</option>
                      <option>Correctivo</option>
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
                      <option value="">Seleccione...</option>
                      <option>Automático</option>
                      <option>Manual</option>
                      <option>Semiautomático</option>
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
                      <option>No</option>
                      <option>Sí</option>
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
                      <option value="">Seleccione...</option>
                      <option>Diario</option>
                      <option>Semanal</option>
                      <option>Mensual</option>
                      <option>Bimensual</option>
                      <option>Trimestral</option>
                      <option>Semestral</option>
                      <option>Anual</option>
                      <option>Cuando se Requiera</option>
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
                      <option>No</option>
                      <option>Sí</option>
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
                        <span className="badge-nivel" style={{ backgroundColor: nivel.color }}>{nivel.nivel}</span>
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
          <AgregarFilaValoracion onAgregar={handleAgregarFilaValoracion} />
          
          {valoraciones.length > 0 && (
            <div className="procesar-riesgos-section">
              <button 
                className="btn-procesar-riesgos"
                onClick={handleProcesarRiesgos}
              >
                <span className="btn-icono">⚡</span>
                Procesar Riesgos Identificados
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ValoracionRiesgos);