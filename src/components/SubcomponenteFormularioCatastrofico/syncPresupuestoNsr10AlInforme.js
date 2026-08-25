/**
 * Lleva el conteo de plata de la hoja Presupuesto NSR-10
 * al presupuesto / indemnización del informe único catastrófico.
 */
import {
  argsDeduciblesPorArticuloDiagrama,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  parseMontoNsr10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  calcularResumenPresupuesto,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from './catalogoPresupuestoCatastrofico.js';

const INTRO_NSR10 =
  'Presupuesto de intervención / reparación post-sismo (plantilla evaluación NSR-10) más liquidación de contenidos. Los valores se trasladan al informe único.';

export function mapearItemsNsr10APresupuestoInforme(filas = []) {
  return (filas || [])
    .filter((row) => {
      const cant = parseMontoNsr10(row?.cantidad);
      const vu = parseMontoNsr10(row?.valorUnitario);
      const tieneActividad =
        String(row?.actividad || '').trim() ||
        String(row?.componente || '').trim() ||
        String(row?.capitulo || '').trim();
      return (
        tieneActividad ||
        (cant != null && cant !== 0) ||
        (vu != null && vu !== 0)
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
      valorUnitario: parseMontoNsr10(row.valorUnitario) ?? 0,
      cantidad: parseMontoNsr10(row.cantidad) ?? 0,
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
  const resumen = calcularResumenTotalesNsr10(evalData);
  const items = mapearItemsNsr10APresupuestoInforme(filas);

  if (!forzar && !items.length && !(resumen.sumaCompleta > 0)) {
    return null;
  }

  const prev = formData.presupuestoCatastrofico || {};
  const liquidacion = formData.liquidacionCatastrofico || {};
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado: liquidacion.valorAsegurado,
    totalDanios: resumen.sumaCompleta,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liquidacion.hospedajePorcentaje ?? HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: liquidacion.hospedajeManual,
    deducible: liquidacion.deducible,
    deducibleConfig: liquidacion.deducibleConfig,
    deducibleConfigContenidos:
      liquidacion.deducibleConfigContenidos || liquidacion.deducibleConfig,
    deducibleConfigPresupuesto: liquidacion.deducibleConfigPresupuesto,
    otrosAmparos: formData.otrosAmparos,
    ...argsDeduciblesPorArticuloDiagrama(liquidacion, resumen),
  });
  return {
    totales: {
      ...totales,
      totalPresupuesto: resumen.totalPresupuesto,
      totalContenidos: resumen.totalContenidos,
      sumaCompleta: resumen.sumaCompleta,
      deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado,
      deduciblePresupuesto: diagrama.deduciblePresupuesto?.aplicado || 0,
      deducibleContenidos: diagrama.deducibleContenidos?.aplicado || 0,
      sumaDeducibles: diagrama.sumaDeducibles || 0,
      gastosHospedaje: diagrama.gastosHospedaje,
      totalIndemnizar: diagrama.totalIndemnizar,
    },
    indemnizacionSugerida: String(Math.round(diagrama.totalIndemnizar || 0)),
    presupuestoCatastrofico: {
      ...prev,
      fuente: 'nsr10',
      intro: INTRO_NSR10,
      items,
      aiuPorcentaje: Number(presupuestoNsr.aiuPorcentaje ?? 0.25),
      imprevistosPorcentaje: Number(presupuestoNsr.imprevistosPorcentaje ?? 0),
      impuestosPorcentaje: Number(presupuestoNsr.impuestosPorcentaje ?? 0),
      totalesNsr10: {
        subtotal: totales.subtotal,
        aiu: totales.aiu,
        imprevistos: totales.imprevistos,
        impuestos: totales.impuestos,
        total: totales.total,
        totalPresupuesto: resumen.totalPresupuesto,
        totalContenidos: resumen.totalContenidos,
        sumaCompleta: resumen.sumaCompleta,
        deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado,
        deduciblePresupuesto: diagrama.deduciblePresupuesto?.aplicado || 0,
        deducibleContenidos: diagrama.deducibleContenidos?.aplicado || 0,
        sumaDeducibles: diagrama.sumaDeducibles || 0,
        gastosHospedaje: diagrama.gastosHospedaje,
        totalIndemnizar: diagrama.totalIndemnizar,
      },
      contenidosNsr10: evalData.contenidos || null,
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
    const suma = Number(presupuesto.totalesNsr10.sumaCompleta);
    if (Number.isFinite(suma) && suma > 0) return suma;
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
