import { buscarItemBasePrecios } from '../SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';
import {
  aplicarCatalogoAFilaPresupuesto,
  calcularTotalesPresupuesto,
  crearFilaPresupuestoVacia,
  formatMilesNsr10,
  parseMontoNsr10,
  totalFilaPresupuesto,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  FUENTE_EXPRESS,
  esIdExpress,
  idsExpressPorTipo,
} from './catalogoLiquidadorCatExpress.js';

const ORDEN_CAPITULO = [
  'Demoliciones',
  'Estructura',
  'Mampostería / Bahareque',
  'Acabados',
  'Limpieza / Retiro',
];

export function esLiquidadorExpress(liquidador) {
  return String(liquidador?.modoLiquidacion || '') === 'express';
}

export function tipoExpressDeLiquidador(liquidador) {
  const raw = String(
    liquidador?.tipoInmuebleExpress ||
      liquidador?.evaluacionSismicaNSR10?.contenidos?.tipoInmueble ||
      ''
  )
    .trim()
    .toLowerCase();
  if (raw.includes('apto') || raw.includes('apart')) return 'apartamento';
  if (
    raw.includes('negocio') ||
    raw.includes('local') ||
    raw.includes('oficina') ||
    raw.includes('industria') ||
    raw.includes('bodega')
  ) {
    return 'negocio';
  }
  return 'casa';
}

function filaDesdeBase(catalogoId, previa = {}) {
  const cat = buscarItemBasePrecios(catalogoId);
  const base = aplicarCatalogoAFilaPresupuesto(crearFilaPresupuestoVacia(), cat);
  const cantPrev = previa.cantidad;
  const vuPrev = previa.valorUnitario;
  return {
    ...base,
    cantidad: cantPrev === 0 || cantPrev ? cantPrev : '',
    valorUnitario:
      vuPrev === 0 || vuPrev
        ? typeof vuPrev === 'number'
          ? formatMilesNsr10(vuPrev)
          : vuPrev
        : base.valorUnitario,
    observacion: previa.observacion || '',
    fuente: FUENTE_EXPRESS,
  };
}

function indicePorCatalogo(items = []) {
  const map = new Map();
  (items || []).forEach((it) => {
    const id = String(it?.catalogoId || '');
    if (id && !map.has(id)) map.set(id, it);
  });
  return map;
}

/** Plantilla visible: todos los ítems fijos del tipo, con cantidades ya liquidas si existen. */
export function construirFilasExpress(liquidador = {}, tipo = 'casa') {
  const ids = idsExpressPorTipo(tipo);
  const guardadas = indicePorCatalogo(liquidador?.presupuestoExpress?.items);
  const nsr = indicePorCatalogo(liquidador?.evaluacionSismicaNSR10?.presupuesto?.items);
  return ids
    .map((id) => {
      const previa = guardadas.get(id) || nsr.get(id) || {};
      return filaDesdeBase(id, previa);
    })
    .filter((it) => it.catalogoId)
    .sort((a, b) => {
      const ca = ORDEN_CAPITULO.indexOf(a.capitulo);
      const cb = ORDEN_CAPITULO.indexOf(b.capitulo);
      if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
      return String(a.actividad || '').localeCompare(String(b.actividad || ''), 'es');
    });
}

export function filasExpressConCantidad(filas = []) {
  return (filas || []).filter((it) => {
    const n = parseMontoNsr10(it?.cantidad);
    return n != null && n > 0;
  });
}

export function totalesExpress(filas = [], aiuPorcentaje = 0.25) {
  return calcularTotalesPresupuesto({
    items: filasExpressConCantidad(filas),
    aiuPorcentaje,
    imprevistosPorcentaje: 0,
    impuestosPorcentaje: 0,
  });
}

export function totalesGuardadoExpress(liquidador = {}, aiuPorcentaje = 0.25) {
  const tipo = tipoExpressDeLiquidador(liquidador);
  const aiu =
    aiuPorcentaje ??
    Number(liquidador?.evaluacionSismicaNSR10?.presupuesto?.aiuPorcentaje) ??
    0.25;
  const t = totalesExpress(construirFilasExpress(liquidador, tipo), aiu);
  return {
    ...t,
    totalPerdida: t.subtotal,
    totalIndemnizar: t.total,
  };
}

/**
 * Escribe el modo express en el liquidador sin borrar ítems robustos ajenos al catálogo.
 * El presupuesto NSR (el que leen informes/Excel) queda con extras + ítems express con cantidad.
 */
export function aplicarFilasExpress(liquidador = {}, filas = [], { tipo = 'casa', aiuPorcentaje } = {}) {
  const evalData = liquidador.evaluacionSismicaNSR10 || {};
  const presupuesto = evalData.presupuesto || {};
  const actuales = Array.isArray(presupuesto.items) ? presupuesto.items : [];
  const extras = actuales.filter((it) => !esIdExpress(it?.catalogoId) && it?.fuente !== FUENTE_EXPRESS);
  const expressActivos = filasExpressConCantidad(filas);
  const aiu =
    aiuPorcentaje != null && Number.isFinite(Number(aiuPorcentaje))
      ? Number(aiuPorcentaje)
      : presupuesto.aiuPorcentaje;

  return {
    ...liquidador,
    modelo: liquidador.modelo || 'nsr10',
    modoLiquidacion: 'express',
    tipoInmuebleExpress: tipo,
    presupuestoExpress: { tipo, items: filas },
    evaluacionSismicaNSR10: {
      ...evalData,
      hojaActiva: evalData.hojaActiva || 'presupuesto',
      contenidos: {
        ...(evalData.contenidos || {}),
        tipoInmueble:
          tipo === 'negocio'
            ? 'Local comercial'
            : tipo === 'apartamento'
              ? 'Apartamento'
              : 'Casa',
      },
      presupuesto: {
        ...presupuesto,
        aiuPorcentaje: aiu,
        imprevistosPorcentaje: 0,
        impuestosPorcentaje: 0,
        items: [...extras, ...expressActivos],
      },
    },
  };
}

export function marcarModoRobusto(liquidador = {}) {
  return { ...liquidador, modoLiquidacion: 'robusto' };
}

export function asegurarModoExpress(liquidador = {}, { tipo, aiuPorcentaje } = {}) {
  const tipoResuelto = tipo || tipoExpressDeLiquidador(liquidador);
  const filas = construirFilasExpress(liquidador, tipoResuelto);
  return aplicarFilasExpress(liquidador, filas, { tipo: tipoResuelto, aiuPorcentaje });
}

export function filasDetalleAlfaDesdeExpress(filas = []) {
  return filasExpressConCantidad(filas).map((it, idx) => {
    const total = totalFilaPresupuesto(it);
    return {
      id: `exp-${it.catalogoId || idx}`,
      catalogoId: it.catalogoId || '',
      capitulo: it.capitulo || '',
      descripcion: it.actividad || '',
      unidad: it.unidad || 'und',
      cantidad: it.cantidad ?? '',
      valorUnitario: it.valorUnitario ?? '',
      valorPerdida: total == null ? '' : formatMilesNsr10(total),
      valorReal: total == null ? '' : formatMilesNsr10(total),
    };
  });
}

export { totalFilaPresupuesto, formatMilesNsr10, parseMontoNsr10 };
