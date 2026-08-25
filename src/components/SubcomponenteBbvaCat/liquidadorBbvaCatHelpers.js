import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './bbvaCatHelpers.js';
import {
  argsDeduciblesPorArticuloDiagrama,
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { defaultOtrosAmparos, normalizarOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';
import { fotosInformeDesdeCaso, sanitizarInformeUnicoFotos } from '../fotosInformeUnicoHelpers.js';
import {
  aplicarTipoLiquidadorEnLiquidacionBbvaCat,
  esObservacionFiniquitoDefaultBbvaCat,
  inferirTipoLiquidadorBbvaCat,
  observacionesFiniquitoPorDefectoBbvaCat,
  TIPO_LIQUIDADOR_DEUDORES,
} from './deduciblesBbvaCat.js';
import {
  calcularTotalesFormatoExcelBbvaCat,
  defaultDeducibleFormatoBbvaCat,
  resolverDeducibleFormatoBbvaCat,
  resolverDetalleLiquidacionBbvaCat,
} from './formatoLiquidacionBbvaCat.js';

export { sanitizarInformeUnicoFotos as sanitizarInformeUnicoBbvaCat };

/** AIU único BBVA (25%). Imprevistos e impuestos no aplican. */
export const AIU_PORCENTAJE_DEFAULT_BBVA_CAT = 0.25;
export const IMPREVISTOS_PORCENTAJE_DEFAULT_BBVA_CAT = 0;
export const IMPUESTOS_PORCENTAJE_DEFAULT_BBVA_CAT = 0;

export const RECARGOS_PRESUPUESTO_BBVA_CAT = {
  aiuFijo: AIU_PORCENTAJE_DEFAULT_BBVA_CAT,
  ocultarImprevistos: true,
  ocultarImpuestos: true,
};

export function normalizarPresupuestoAiuBbvaCat(presupuesto = {}) {
  const p = presupuesto && typeof presupuesto === 'object' ? { ...presupuesto } : {};
  p.aiuPorcentaje = AIU_PORCENTAJE_DEFAULT_BBVA_CAT;
  p.imprevistosPorcentaje = IMPREVISTOS_PORCENTAJE_DEFAULT_BBVA_CAT;
  p.impuestosPorcentaje = IMPUESTOS_PORCENTAJE_DEFAULT_BBVA_CAT;
  return p;
}

export function aplicarPresupuestoAiuBbvaCatEnEvaluacion(evalData = {}) {
  const data = evalData && typeof evalData === 'object' ? evalData : {};
  return {
    ...data,
    presupuesto: normalizarPresupuestoAiuBbvaCat(data.presupuesto || {}),
  };
}

export { SMMLV_TABLA_BBVA as SMMLV_POR_ANIO } from './formatoLiquidacionBbvaCat.js';
export const SMMLV_DEFAULT = 1750905;

/** Texto fijo editable: información general del evento (consolidado terremoto BbvaCat). */
export const INFO_EVENTO_DEFAULT_BBVA_CAT = `El presente informe se elabora en el marco de la atención del evento sísmico / catastrófico reportado ante BBVA Seguros, conforme a la visita de inspección realizada al predio asegurado y a la documentación aportada por el tomador/asegurado.

La evaluación técnica tiene por objeto verificar la existencia y alcance de los daños, confrontarlos con las coberturas de la póliza vigente y cuantificar las pérdidas indemnizables de acuerdo con las condiciones particulares del contrato de seguro.`;

export function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }
  const n = parseFloat(numero);
  return Number.isNaN(n) ? 0 : n;
}

export function formatearMonto(valor, { decimals = 0 } = {}) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** @deprecated compat — ítems FDM ya no se usan en el flujo activo */
export function crearItemBbvaCat(item = '', valor = '', id) {
  return {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    item: item || '',
    valor:
      valor === null || valor === undefined || valor === '' ? '' : formatMiles(valor),
  };
}

/** @deprecated */
export function migrarItemLegacy(it = {}) {
  if (it.item != null || (it.valor != null && it.concepto == null)) {
    return crearItemBbvaCat(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemBbvaCat(it.concepto || '', valor, it.id);
}

const fechaInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function liquidacionCatastroficoDefaultBbvaCat(caso = {}, tipoLiquidador = '') {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
      : '';
  const tipo = inferirTipoLiquidadorBbvaCat({ tipoLiquidador, caso: c });
  return aplicarTipoLiquidadorEnLiquidacionBbvaCat(
    {
      valorAsegurado: va,
      hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
      hospedajeManual: '',
      deducible: '',
      deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
      deducibleConfigPresupuesto: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    },
    tipo,
    { forzarDeducible: true }
  );
}

export function encabezadoDesdecasoBbvaCat(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  return {
    tomador: c.tomador || '',
    asegurado: c.asegurado || c.informacionContacto || '',
    poliza: c.numeroPoliza || '',
    tipoPoliza: c.tipoPoliza || '',
    credito: c.numeroCredito || '',
    siniestro: c.siniestro || '',
    consecutivo: c.consecutivo || '',
    identificacion: c.identificacion || '',
    tipoIdentificacion: c.tipoIdentificacion || '',
    causa: c.causa || '',
    fechaSiniestro: fechaInput(c.fechaSiniestro),
    direccion: c.direccionPredio || '',
    ciudad: c.ciudad || '',
    departamento: c.departamento || '',
    cobertura: c.cobertura || '',
    evento: c.cobertura || c.causa || 'TERREMOTO',
    ajustador: c.ajustador || '',
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
    vigenciaDesde: fechaInput(c.fechaInicioPoliza),
    vigenciaHasta: fechaInput(c.fechaFinPoliza),
    ramoAfectado: c.cobertura || 'TERREMOTO',
    trm: c.trm || '',
    valorGlobal: c.valorAseguradoInmueble ?? '',
  };
}

/** Prefill portada NSR desde caso BBVA CAT */
export function prefillNsrDesdecasoBbvaCat(caso = {}, encabezado = {}) {
  return {
    fechaInspeccion: fechaInput(caso.fechaInspeccion),
    asegurado: encabezado.asegurado || caso.asegurado || caso.informacionContacto || '',
    poliza: encabezado.poliza || caso.numeroPoliza || '',
    municipio: encabezado.ciudad || caso.ciudad || '',
    ciudad: encabezado.ciudad || caso.ciudad || '',
    direccion: encabezado.direccion || caso.direccionPredio || '',
    direccionRiesgo: encabezado.direccion || caso.direccionPredio || '',
    fechaSiniestro: encabezado.fechaSiniestro || fechaInput(caso.fechaSiniestro),
    fechaOcurrencia: encabezado.fechaSiniestro || fechaInput(caso.fechaSiniestro),
    inspector: caso.ajustador || '',
    tipoEvento: encabezado.evento || caso.cobertura || 'TERREMOTO',
  };
}

export const DEFAULT_LIQUIDADOR_BbvaCat = {
  modelo: 'nsr10',
  encabezado: {
    tomador: '',
    asegurado: '',
    poliza: '',
    tipoPoliza: '',
    credito: '',
    siniestro: '',
    consecutivo: '',
    identificacion: '',
    tipoIdentificacion: '',
    causa: '',
    fechaSiniestro: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    cobertura: '',
    evento: 'TERREMOTO',
    ajustador: '',
    valorAseguradoInmueble: '',
    vigenciaDesde: '',
    vigenciaHasta: '',
    ramoAfectado: 'TERREMOTO',
    trm: '',
    valorGlobal: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultBbvaCat(),
  indemnizacionSugerida: '',
  observaciones: '',
  tipoLiquidador: TIPO_LIQUIDADOR_DEUDORES,
  aceptacionIndemnizacion: '',
  observacionesFiniquito: '',
  firmaCliente: '',
  nombreFirmante: '',
  detalleLiquidacionCat: null,
  deducibleFormato: defaultDeducibleFormatoBbvaCat(TIPO_LIQUIDADOR_DEUDORES),
  liquidadoPor: '',
  areaLiquidador: 'Indemnizaciones Seguros Generales',
  datosFiniquito: {
    ciudadFirma: '',
    diaFirma: '',
    mesFirma: '',
    anioFirma: '',
  },
};

export function esLiquidadorNsrBbvaCat(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales BBVA CAT = formato Excel (detalle + 4 tipos de deducible).
 * El presupuesto NSR-10 sigue disponible como origen técnico / dictamen.
 */
export function calcularLiquidacionBbvaCat(liquidador = {}) {
  const evalData = aplicarPresupuestoAiuBbvaCatEnEvaluacion(
    liquidador.evaluacionSismicaNSR10 || {}
  );
  const presupuesto = evalData.presupuesto || { items: [] };
  const totalesPres = calcularTotalesPresupuesto(presupuesto);
  const resumen = calcularResumenTotalesNsr10(evalData);
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  const excel = calcularTotalesFormatoExcelBbvaCat(liquidador);
  const valorAsegurado =
    excel.valorGlobal ||
    parsearNumero(liq.valorAsegurado) ||
    parsearNumero(enc.valorAseguradoInmueble) ||
    0;
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado,
    totalDanios: excel.sumaIndemnizable || resumen.sumaCompleta,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: liq.deducibleConfig,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || liq.deducibleConfig,
    deducibleConfigPresupuesto: liq.deducibleConfigPresupuesto,
    otrosAmparos: liquidador.otrosAmparos,
    ...argsDeduciblesPorArticuloDiagrama(liq, resumen),
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);
  const totalOtrosAmparos = diagrama.totalOtrosAmparos || 0;
  const totalIndemnizar = Math.max(
    0,
    Math.round((excel.valorAIndemnizar + totalOtrosAmparos) * 100) / 100
  );
  const tipos = excel.tiposDeducible || {};

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta: excel.sumaIndemnizable || resumen.sumaCompleta,
    subtotal: excel.subTotal,
    aiu: totalesPres.aiu,
    imprevistos: totalesPres.imprevistos,
    impuestos: totalesPres.impuestos,
    totalDanios: excel.sumaIndemnizable || resumen.sumaCompleta,
    diagrama: {
      ...diagrama,
      deducibleAplicado: excel.deducibleAplicable,
      sumaDeducibles: excel.deducibleAplicable,
      totalIndemnizar,
    },
    criterio,
    formatoExcel: excel,
    totalIndemnizar,
    totalIndemnizable: totalIndemnizar,
    totalPerdida: excel.sumaIndemnizable || resumen.sumaCompleta,
    totalReclamado: parsearNumero(liquidador.valorReclamadoCaso) || excel.sumaIndemnizable,
    deducibleAplicado: excel.deducibleAplicable,
    deducibleTexto: `Aplica el mayor de SMMLV / % / USD / pesos (${tipos.tipoAplicadoLabel || 'SMMLV'})`,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: excel.subTotal,
    diferencia: 0,
    usaSMMLV: tipos.tipoAplicado === 'smmlv',
    totalOtrosAmparos,
    otrosAmparos: diagrama.otrosAmparos || [],
    deducibleRequiereValorAsegurado: !valorAsegurado,
    valorAsegurado,
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosBbvaCat(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (!Array.isArray(items) || !items.length) return [];
  return items
    .filter((it) => String(it?.actividad || it?.componente || '').trim())
    .map((it) => ({
      id: it.id,
      concepto: it.actividad || it.componente || 'Ítem',
      valorReclamado: '',
      valorIndemnizable: it.total ?? '',
      cantidad: it.cantidad,
      valorUnitario: it.valorUnitario,
    }));
}

export function mapcasoBbvaCatALiquidador(caso = {}) {
  const encabezado = encabezadoDesdecasoBbvaCat(caso);
  const prefill = prefillNsrDesdecasoBbvaCat(caso, encabezado);
  const evalInicial = aplicarPresupuestoAiuBbvaCatEnEvaluacion(
    fusionarEvaluacionSismicaNSR10Guardada({}, prefill)
  );
  const tipoInicial = inferirTipoLiquidadorBbvaCat({ encabezado, caso });
  const hoy = new Date();
  const datosFiniquitoDefault = {
    ciudadFirma: encabezado.ciudad || caso.ciudad || '',
    diaFirma: String(hoy.getDate()),
    mesFirma: String(hoy.getMonth() + 1),
    anioFirma: String(hoy.getFullYear()),
  };
  const base = {
    ...DEFAULT_LIQUIDADOR_BbvaCat,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultBbvaCat(caso, tipoInicial),
    tipoLiquidador: tipoInicial,
    observacionesFiniquito: observacionesFiniquitoPorDefectoBbvaCat(tipoInicial),
    deducibleFormato: defaultDeducibleFormatoBbvaCat(tipoInicial),
    liquidadoPor: caso.ajustador || '',
    areaLiquidador: 'Indemnizaciones Seguros Generales',
    datosFiniquito: datosFiniquitoDefault,
    otrosAmparos: defaultOtrosAmparos(),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrBbvaCat(guardado)) {
    return {
      ...base,
      encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
      observaciones: guardado.observaciones || '',
      valorReclamadoCaso: guardado.valorReclamadoCaso || base.valorReclamadoCaso,
      otrosAmparos: Array.isArray(guardado.otrosAmparos)
        ? normalizarOtrosAmparos(guardado.otrosAmparos)
        : defaultOtrosAmparos(),
    };
  }

  const encabezadoFusion = { ...base.encabezado, ...(guardado.encabezado || {}) };
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: guardado.tipoLiquidador,
    encabezado: encabezadoFusion,
    caso,
  });
  const liqFusion = aplicarTipoLiquidadorEnLiquidacionBbvaCat(
    {
      ...base.liquidacionCatastrofico,
      ...(guardado.liquidacionCatastrofico || {}),
      valorAsegurado:
        guardado.liquidacionCatastrofico?.valorAsegurado ??
        encabezadoFusion.valorAseguradoInmueble ??
        base.liquidacionCatastrofico.valorAsegurado,
    },
    tipo
  );
  const obsFiniquitoGuardada =
    guardado.observacionesFiniquito != null && String(guardado.observacionesFiniquito).trim() !== ''
      ? guardado.observacionesFiniquito
      : esObservacionFiniquitoDefaultBbvaCat(guardado.observaciones)
        ? observacionesFiniquitoPorDefectoBbvaCat(tipo)
        : guardado.observaciones || observacionesFiniquitoPorDefectoBbvaCat(tipo);

  return {
    ...base,
    ...guardado,
    modelo: 'nsr10',
    tipoLiquidador: tipo,
    aceptacionIndemnizacion: guardado.aceptacionIndemnizacion || '',
    observacionesFiniquito: obsFiniquitoGuardada,
    firmaCliente: guardado.firmaCliente || '',
    nombreFirmante: guardado.nombreFirmante || encabezadoFusion.asegurado || '',
    datosFiniquito: {
      ...datosFiniquitoDefault,
      ...(guardado.datosFiniquito || {}),
      ciudadFirma:
        guardado.datosFiniquito?.ciudadFirma ||
        encabezadoFusion.ciudad ||
        datosFiniquitoDefault.ciudadFirma,
    },
    encabezado: encabezadoFusion,
    evaluacionSismicaNSR10: aplicarPresupuestoAiuBbvaCatEnEvaluacion(
      fusionarEvaluacionSismicaNSR10Guardada(guardado.evaluacionSismicaNSR10, prefill)
    ),
    liquidacionCatastrofico: liqFusion,
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
    otrosAmparos: Array.isArray(guardado.otrosAmparos)
      ? normalizarOtrosAmparos(guardado.otrosAmparos)
      : defaultOtrosAmparos(),
    detalleLiquidacionCat: Array.isArray(guardado.detalleLiquidacionCat)
      ? guardado.detalleLiquidacionCat
      : resolverDetalleLiquidacionBbvaCat({
          ...guardado,
          encabezado: encabezadoFusion,
          evaluacionSismicaNSR10: aplicarPresupuestoAiuBbvaCatEnEvaluacion(
            fusionarEvaluacionSismicaNSR10Guardada(guardado.evaluacionSismicaNSR10, prefill)
          ),
        }),
    deducibleFormato: resolverDeducibleFormatoBbvaCat({ ...guardado, tipoLiquidador: tipo }),
    liquidadoPor: guardado.liquidadoPor || caso.ajustador || '',
    areaLiquidador: guardado.areaLiquidador || 'Indemnizaciones Seguros Generales',
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorBbvaCat(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoBbvaCat(caso, enc),
    evaluacionSismicaNSR10: aplicarPresupuestoAiuBbvaCatEnEvaluacion(
      liquidador.evaluacionSismicaNSR10 || {}
    ),
    liquidacionCatastrofico: {
      ...(liquidador.liquidacionCatastrofico || {}),
      valorAsegurado:
        liquidador.liquidacionCatastrofico?.valorAsegurado ?? enc.valorAseguradoInmueble,
    },
    indemnizacionSugerida: liquidador.indemnizacionSugerida,
    otrosAmparos: liquidador.otrosAmparos,
    asegurado: enc.asegurado,
    ciudad: enc.ciudad,
    direccionRiesgo: enc.direccion,
    numeroPoliza: enc.poliza,
    fechaSiniestro: enc.fechaSiniestro,
    actaAjustadorNombre: enc.ajustador || caso.ajustador || '',
  };
}

export function defaultInformeUnicoBbvaCat(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_BBVA_CAT,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    actaAjustadorNombre: caso.ajustador || '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    firmaAjustador: '',
  };
  if (!guardado) return base;
  return {
    ...base,
    ...guardado,
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
  };
}

export function formatDateLarga(value) {
  if (!value) return '—';
  try {
    return formatDate(value, getAppLocale(), {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}
