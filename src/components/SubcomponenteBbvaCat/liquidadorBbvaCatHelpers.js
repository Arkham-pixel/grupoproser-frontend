import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './bbvaCatHelpers.js';
import {
  argsDeduciblesPorArticuloDiagrama,
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
  camposValorAseguradoParaNsr,
  valoresAsegurablesDesdeLiquidador,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { defaultOtrosAmparos, normalizarOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';
import { fotosInformeDesdeCaso, sanitizarInformeUnicoFotos } from '../fotosInformeUnicoHelpers.js';
import {
  fotosCotizacionDesdeLiquidador,
  montoCotizacionPdf,
  serializarCotizacionPdf,
  serializarPaginasCotizacion,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import {
  aplicarTipoLiquidadorEnLiquidacionBbvaCat,
  esObservacionFiniquitoDefaultBbvaCat,
  inferirTipoLiquidadorBbvaCat,
  observacionesFiniquitoPorDefectoBbvaCat,
  TIPO_LIQUIDADOR_DEUDORES,
} from './deduciblesBbvaCat.js';
import {
  calcularTotalesFormatoExcelBbvaCat,
  calcularLiquidacionCotizacionPdfBbvaCat,
  defaultDeducibleFormatoBbvaCat,
  resolverDeducibleFormatoBbvaCat,
  resolverDetalleLiquidacionBbvaCat,
} from './formatoLiquidacionBbvaCat.js';

export function sanitizarInformeUnicoBbvaCat(informe = {}) {
  if (!informe || typeof informe !== 'object') return {};
  const base = sanitizarInformeUnicoFotos(informe);
  return {
    ...base,
    fotosCotizacion: serializarPaginasCotizacion(informe.fotosCotizacion),
  };
}

/** Quita File/blob/preview del liquidador antes de guardar en Mongo. */
export function sanitizarLiquidadorBbvaCat(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return liquidador;
  return {
    ...liquidador,
    cotizacionPdf: serializarCotizacionPdf(liquidador.cotizacionPdf),
  };
}

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

function montoHueco(valor) {
  if (valor == null || valor === '') return true;
  const n = parsearNumero(valor);
  return !Number.isFinite(n) || n <= 0;
}

function primerMontoPositivo(...cands) {
  for (const c of cands) {
    if (c == null || c === '') continue;
    const n = parsearNumero(c);
    if (n > 0) return n;
  }
  return undefined;
}

/**
 * Sube al caso SOLO lo del ajustador (Proser).
 * Reserva / reclamado / estimado de BBVA no se pisan.
 * valorALiquidar = indemnización neta del liquidador (después del deducible).
 * valorLiquidado (reserva ajustador) no se pisa: el AIU 25% vive en el liquidador
 * de cada caso, con sus cifras reales.
 */
export function camposValoresDesdeLiquidadorBbvaCat(liquidador = {}, totales = {}, casoBase = {}) {
  const tot =
    totales && parsearNumero(totales.totalIndemnizar) > 0
      ? totales
      : calcularLiquidacionBbvaCat(liquidador);
  const enc =
    liquidador?.encabezado && typeof liquidador.encabezado === 'object'
      ? liquidador.encabezado
      : {};
  const liq =
    liquidador?.liquidacionCatastrofico && typeof liquidador.liquidacionCatastrofico === 'object'
      ? liquidador.liquidacionCatastrofico
      : {};
  const out = {};

  if (montoHueco(casoBase.valorAseguradoInmueble)) {
    const va = primerMontoPositivo(enc.valorAseguradoInmueble, enc.valorGlobal, liq.valorAsegurado);
    if (va > 0) out.valorAseguradoInmueble = va;
  }

  if (montoHueco(casoBase.valorReclamado)) {
    const rec = primerMontoPositivo(
      liquidador.valorReclamadoCaso,
      tot.cotizacionMonto,
      montoCotizacionPdf(liquidador.cotizacionPdf)
    );
    if (rec > 0) out.valorReclamado = rec;
  }

  const liquidado = Math.max(
    0,
    primerMontoPositivo(tot.totalIndemnizar, tot.totalIndemnizable) || 0
  );
  out.valorALiquidar = Math.round(liquidado);

  return out;
}

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
    valorAseguradoContenidos: c.valorAseguradoContenidos ?? '',
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
    ...camposValorAseguradoParaNsr(caso, encabezado),
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
    valorAseguradoContenidos: '',
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
  cotizacionPdf: null,
  liquidacionCotizacionPdf: null,
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
  const valoresAsegurablesCaso = valoresAsegurablesDesdeLiquidador(liquidador);
  const totalesPres = calcularTotalesPresupuesto(presupuesto, valoresAsegurablesCaso);
  const resumen = calcularResumenTotalesNsr10(evalData, valoresAsegurablesCaso);
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  const excel = calcularTotalesFormatoExcelBbvaCat(liquidador);
  const cotiz = calcularLiquidacionCotizacionPdfBbvaCat(liquidador);
  const montoCotiz = cotiz.monto || montoCotizacionPdf(liquidador.cotizacionPdf);
  const usaCotiz = Boolean(cotiz.activo);
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
  const indemnizacionBase = usaCotiz ? cotiz.valorAIndemnizar : excel.valorAIndemnizar;
  const totalIndemnizar = Math.max(
    0,
    Math.round((indemnizacionBase + totalOtrosAmparos) * 100) / 100
  );
  const tipos = (usaCotiz ? cotiz.tiposDeducible : excel.tiposDeducible) || {};
  const deducibleAplicado = usaCotiz ? cotiz.deducibleAplicable : excel.deducibleAplicable;

  return {
    modelo: 'nsr10',
    origenLiquidacion: usaCotiz ? 'cotizacion' : 'formato',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta: usaCotiz ? cotiz.monto : excel.sumaIndemnizable || resumen.sumaCompleta,
    subtotal: usaCotiz ? cotiz.subTotal : excel.subTotal,
    aiu: usaCotiz ? cotiz.aiu : excel.aiu,
    aiuPct: usaCotiz ? cotiz.aiuPct : excel.aiuPct,
    imprevistos: totalesPres.imprevistos,
    impuestos: totalesPres.impuestos,
    totalDanios: usaCotiz ? cotiz.monto : excel.sumaIndemnizable || resumen.sumaCompleta,
    diagrama: {
      ...diagrama,
      deducibleAplicado,
      sumaDeducibles: deducibleAplicado,
      totalIndemnizar,
    },
    criterio,
    formatoExcel: excel,
    liquidacionCotizacion: cotiz,
    totalIndemnizar,
    totalIndemnizable: totalIndemnizar,
    totalPerdida: usaCotiz ? cotiz.monto : excel.sumaIndemnizable || resumen.sumaCompleta,
    totalReclamado:
      parsearNumero(liquidador.valorReclamadoCaso) ||
      (montoCotiz > 0 ? montoCotiz : excel.sumaIndemnizable),
    cotizacionMonto: montoCotiz,
    deducibleAplicado,
    deducibleTexto: usaCotiz
      ? cotiz.deducibleTexto
      : `Aplica el mayor de SMMLV / % / USD / pesos (${tipos.tipoAplicadoLabel || 'SMMLV'})`,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: usaCotiz ? cotiz.subTotal : excel.subTotal,
    diferencia: 0,
    usaSMMLV: tipos.tipoAplicado === 'smmlv',
    totalOtrosAmparos,
    otrosAmparos: diagrama.otrosAmparos || [],
    deducibleRequiereValorAsegurado: usaCotiz ? !(cotiz.valorGlobal > 0) : !valorAsegurado,
    valorAsegurado: usaCotiz ? cotiz.valorGlobal || valorAsegurado : valorAsegurado,
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosBbvaCat(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  const nsr = (Array.isArray(items) ? items : [])
    .filter((it) => String(it?.actividad || it?.componente || '').trim())
    .map((it) => ({
      id: it.id,
      concepto: it.actividad || it.componente || 'Ítem',
      valorReclamado: '',
      valorIndemnizable: it.total ?? '',
      cantidad: it.cantidad,
      valorUnitario: it.valorUnitario,
    }));
  const monto = montoCotizacionPdf(liquidador.cotizacionPdf);
  if (!(monto > 0)) return nsr;
  const nombre = String(liquidador.cotizacionPdf?.nombreOriginal || '').trim();
  return [
    {
      id: 'cotizacion-pdf',
      concepto: nombre
        ? `Cotización del asegurado (${nombre})`
        : 'Cotización del asegurado (PDF)',
      valorReclamado: monto,
      valorIndemnizable: '',
    },
    ...nsr,
  ];
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
      cotizacionPdf: guardado.cotizacionPdf || null,
      liquidacionCotizacionPdf: guardado.liquidacionCotizacionPdf || null,
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
    cotizacionPdf: guardado.cotizacionPdf || null,
    liquidacionCotizacionPdf: guardado.liquidacionCotizacionPdf || null,
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorBbvaCat(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoBbvaCat(caso, enc),
    ...camposValorAseguradoParaNsr(caso, enc),
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
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
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
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
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
