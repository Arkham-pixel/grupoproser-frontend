/**
 * Lleva el conteo de plata de la hoja Presupuesto NSR-10
 * al presupuesto / indemnización del informe único catastrófico.
 */
import { calcularTotalesPresupuesto } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { calcularResumenPresupuesto } from './catalogoPresupuestoCatastrofico.js';

const INTRO_NSR10 =
  'Presupuesto de intervención / reparación post-sismo (plantilla evaluación NSR-10). Los valores corresponden al conteo de la evaluación sísmica y se trasladan al informe único.';

export function mapearItemsNsr10APresupuestoInforme(filas = []) {
  return (filas || [])
    .filter((row) => {
      const cant = Number(row?.cantidad);
      const vu = Number(row?.valorUnitario);
      const tieneActividad =
        String(row?.actividad || '').trim() ||
        String(row?.componente || '').trim() ||
        String(row?.capitulo || '').trim();
      return (
        tieneActividad ||
        (Number.isFinite(cant) && cant !== 0) ||
        (Number.isFinite(vu) && vu !== 0)
      );
    })
    .map((row, index) => ({
      id: `nsr10-${row.codigoEvaluacion || index}`,
      // Campos del liquidador NSR-10 (misma grilla de la plataforma)
      capitulo: row.capitulo || '',
      codigoEvaluacion: row.codigoEvaluacion || '',
      componente: row.componente || '',
      actividad: String(row.actividad || '').trim() || String(row.componente || '').trim(),
      unidad: row.unidad || 'und',
      valorUnitario:
        row.valorUnitario === '' || row.valorUnitario == null
          ? 0
          : Number(row.valorUnitario),
      cantidad:
        row.cantidad === '' || row.cantidad == null ? 0 : Number(row.cantidad),
      prioridad: row.prioridad || '',
      cubierto: row.cubierto || '',
      observacion: row.observacion || '',
      fuente: row.fuente || '',
    }));
}

/** ¿Hay plantilla NSR-10 en el formulario? */
export function tienePresupuestoNsr10(formData = {}) {
  return Boolean(formData?.evaluacionSismicaNSR10?.presupuesto);
}

/**
 * @returns {{ presupuestoCatastrofico: object, indemnizacionSugerida: string, totales: object } | null}
 */
export function sincronizarPresupuestoNsr10AlInforme(formData = {}, { forzar = false } = {}) {
  const evalData = formData.evaluacionSismicaNSR10 || {};
  const presupuestoNsr = evalData.presupuesto || {};
  const filas = Array.isArray(presupuestoNsr.items) ? presupuestoNsr.items : [];
  const totales = calcularTotalesPresupuesto(presupuestoNsr);
  const items = mapearItemsNsr10APresupuestoInforme(filas);

  if (!forzar && !items.length && !(totales.total > 0)) {
    return null;
  }

  const prev = formData.presupuestoCatastrofico || {};
  return {
    totales,
    indemnizacionSugerida: String(Math.round(totales.total || 0)),
    presupuestoCatastrofico: {
      ...prev,
      fuente: 'nsr10',
      intro: INTRO_NSR10,
      items,
      aiuPorcentaje: Number(presupuestoNsr.aiuPorcentaje ?? 0.05),
      imprevistosPorcentaje: Number(presupuestoNsr.imprevistosPorcentaje ?? 0.1),
      impuestosPorcentaje: Number(presupuestoNsr.impuestosPorcentaje ?? 0),
      totalesNsr10: {
        subtotal: totales.subtotal,
        aiu: totales.aiu,
        imprevistos: totales.imprevistos,
        impuestos: totales.impuestos,
        total: totales.total,
      },
    },
  };
}

/**
 * Fuente de verdad para Word / informe: siempre la hoja Presupuesto NSR-10
 * cuando existe evaluación sísmica.
 */
export function resolverPresupuestoParaWord(formData = {}) {
  if (tienePresupuestoNsr10(formData)) {
    const sync = sincronizarPresupuestoNsr10AlInforme(formData, { forzar: true });
    return sync?.presupuestoCatastrofico || formData.presupuestoCatastrofico || {};
  }
  return formData.presupuestoCatastrofico || {};
}

/** Total de daños que debe usar el informe / Word / liquidación. */
export function obtenerTotalDaniosParaInforme(presupuesto = {}) {
  if (presupuesto?.fuente === 'nsr10' && presupuesto?.totalesNsr10) {
    return Number(presupuesto.totalesNsr10.total) || 0;
  }
  const resumen = calcularResumenPresupuesto(
    presupuesto?.items || [],
    presupuesto?.aiuPorcentaje
  );
  return resumen.total;
}

/** Aplica sync NSR-10 sobre un formData y devuelve el objeto listo para Word/guardado. */
export function formDataConPresupuestoNsr10(formData = {}) {
  const sync = sincronizarPresupuestoNsr10AlInforme(formData, { forzar: true });
  if (!sync) return formData;
  return {
    ...formData,
    presupuestoCatastrofico: sync.presupuestoCatastrofico,
    indemnizacionSugerida: sync.indemnizacionSugerida,
  };
}
