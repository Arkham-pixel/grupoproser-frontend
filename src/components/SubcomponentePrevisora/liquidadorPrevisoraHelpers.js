import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './previsoraHelpers.js';
import {
  aplicarRecargosEnEvaluacionNsr10,
  argsDeduciblesPorArticuloDiagrama,
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
  RECARGOS_PRESUPUESTO_NSR10_CAT,
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
  serializarCotizacionPdf,
  serializarPaginasCotizacion,
  montoCotizacionPdf,
  usaCotizacionComoBasePresupuesto,
} from '../liquidacion/cotizacionPdfLiquidacion.js';

export function sanitizarInformeUnicoPrevisora(informe = {}) {
  const base = sanitizarInformeUnicoFotos(informe);
  return {
    ...base,
    fotosCotizacion: serializarPaginasCotizacion(informe?.fotosCotizacion),
  };
}

/** Quita File/blob/preview del liquidador antes de guardar en Mongo. */
export function sanitizarLiquidadorPrevisora(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return liquidador;
  return {
    ...liquidador,
    cotizacionPdf: serializarCotizacionPdf(liquidador.cotizacionPdf),
  };
}

export const SMMLV_POR_ANIO = {
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

/** Texto fijo editable: información general del evento (consolidado terremoto Previsora). */
export const INFO_EVENTO_DEFAULT_PREVISORA = `El presente informe se elabora en el marco de la atención del evento sísmico / catastrófico reportado ante Previsora, conforme a la visita de inspección realizada al predio asegurado y a la documentación aportada por el tomador/asegurado.

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
export function crearItemPrevisora(item = '', valor = '', id) {
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
    return crearItemPrevisora(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemPrevisora(it.concepto || '', valor, it.id);
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

export function liquidacionCatastroficoDefaultPrevisora(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
      : '';
  return {
    valorAsegurado: va,
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: 'No aplica',
    deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    deducibleConfigPresupuesto: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
  };
}

export function encabezadoDesdecasoPrevisora(caso = {}) {
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
    evento: c.cobertura || 'TERREMOTO',
    ajustador: c.ajustador || '',
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
    valorAseguradoContenidos: c.valorAseguradoContenidos ?? '',
  };
}

/** Prefill portada NSR desde caso Previsora */
export function prefillNsrDesdecasoPrevisora(caso = {}, encabezado = {}) {
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

export const DEFAULT_LIQUIDADOR_Previsora = {
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
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultPrevisora(),
  indemnizacionSugerida: '',
  observaciones: '',
  cotizacionPdf: null,
};

export function esLiquidadorNsrPrevisora(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales Previsora = presupuesto NSR-10 o cotización PDF + contenidos + diagrama.
 * Compat: expone totalIndemnizar / totalIndemnizable para finiquito e informe.
 */
export function calcularLiquidacionPrevisora(liquidador = {}) {
  const evalData = aplicarRecargosEnEvaluacionNsr10(
    liquidador.evaluacionSismicaNSR10 || {},
    RECARGOS_PRESUPUESTO_NSR10_CAT
  );
  const presupuesto = evalData.presupuesto || { items: [] };
  const valoresAsegurablesCaso = valoresAsegurablesDesdeLiquidador(liquidador);
  const totalesPres = calcularTotalesPresupuesto(presupuesto, valoresAsegurablesCaso);
  const resumen = calcularResumenTotalesNsr10(evalData, valoresAsegurablesCaso);
  const liq = liquidador.liquidacionCatastrofico || {};
  const usaCotiz = usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf);
  const montoCotiz = montoCotizacionPdf(liquidador.cotizacionPdf);
  const totalPresupuesto = usaCotiz ? montoCotiz : resumen.totalPresupuesto;
  const sumaCompleta = Math.round((totalPresupuesto + resumen.totalContenidos) * 100) / 100;
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado: liq.valorAsegurado,
    totalDanios: sumaCompleta,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: liq.deducibleConfig,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || liq.deducibleConfig,
    deducibleConfigPresupuesto: liq.deducibleConfigPresupuesto,
    otrosAmparos: liquidador.otrosAmparos,
    ...(() => {
      const args = argsDeduciblesPorArticuloDiagrama(liq, resumen);
      if (!usaCotiz) return args;
      return {
        ...args,
        usaDeduciblePorArticuloPresupuesto: false,
        deduciblePresupuestoPorArticulos: 0,
        presupuestoNetoPorArticulo: null,
      };
    })(),
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta,
    subtotal: usaCotiz ? montoCotiz : totalesPres.subtotal,
    aiu: usaCotiz ? 0 : totalesPres.aiu,
    imprevistos: usaCotiz ? 0 : totalesPres.imprevistos,
    impuestos: usaCotiz ? 0 : totalesPres.impuestos,
    totalDanios: sumaCompleta,
    origenPresupuesto: usaCotiz ? 'cotizacion' : 'nsr10',
    cotizacionMonto: montoCotiz,
    diagrama,
    criterio,
    totalIndemnizar: diagrama.totalIndemnizar,
    totalIndemnizable: diagrama.totalIndemnizar,
    totalPerdida: sumaCompleta,
    totalReclamado: parsearNumero(liquidador.valorReclamadoCaso) || sumaCompleta,
    deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado || 0,
    deducibleTexto: [
      diagrama.deduciblePresupuesto?.aplica ? `Presupuesto: ${diagrama.deduciblePresupuesto.texto}` : null,
      diagrama.deducibleContenidos?.aplica || diagrama.deducibleAplica
        ? `Contenidos: ${diagrama.deducibleContenidos?.texto || diagrama.deducible}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || diagrama.deducible,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: totalPresupuesto,
    diferencia: 0,
    usaSMMLV: Boolean(diagrama.deducibleUsaMinimo && diagrama.deducibleTipoMinimo === 'SMMLV'),
    totalOtrosAmparos: diagrama.totalOtrosAmparos || 0,
    otrosAmparos: diagrama.otrosAmparos || [],
  };
}

/** Filas planas del presupuesto NSR o de la cotización PDF (para resúmenes). */
export function itemsPlanosPrevisora(liquidador = {}) {
  if (usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf)) {
    const monto = montoCotizacionPdf(liquidador.cotizacionPdf);
    const nombre = String(liquidador.cotizacionPdf?.nombreOriginal || '').trim();
    return [
      {
        id: 'cotizacion-pdf',
        concepto: nombre ? `Cotización de reparación (${nombre})` : 'Cotización de reparación',
        valorReclamado: monto,
        valorIndemnizable: monto,
      },
    ];
  }
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

export function mapcasoPrevisoraALiquidador(caso = {}) {
  const encabezado = encabezadoDesdecasoPrevisora(caso);
  const prefill = prefillNsrDesdecasoPrevisora(caso, encabezado);
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill, {
    recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT,
  });
  const base = {
    ...DEFAULT_LIQUIDADOR_Previsora,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultPrevisora(caso),
    otrosAmparos: defaultOtrosAmparos(),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrPrevisora(guardado)) {
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

  return {
    ...base,
    ...guardado,
    modelo: 'nsr10',
    encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
    evaluacionSismicaNSR10: fusionarEvaluacionSismicaNSR10Guardada(
      guardado.evaluacionSismicaNSR10,
      prefill,
      { recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT }
    ),
    liquidacionCatastrofico: {
      ...base.liquidacionCatastrofico,
      ...(guardado.liquidacionCatastrofico || {}),
    },
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
    otrosAmparos: Array.isArray(guardado.otrosAmparos)
      ? normalizarOtrosAmparos(guardado.otrosAmparos)
      : defaultOtrosAmparos(),
    cotizacionPdf: guardado.cotizacionPdf || null,
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorPrevisora(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoPrevisora(caso, enc),
    ...camposValorAseguradoParaNsr(caso, enc),
    evaluacionSismicaNSR10: liquidador.evaluacionSismicaNSR10,
    liquidacionCatastrofico: liquidador.liquidacionCatastrofico,
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

/** Conceptos de la tabla CONCEPTO / ANÁLISIS / CONCLUSIÓN (misma fórmula SURA). */
export const CONCEPTOS_POLIZA_PREVISORA = [
  'Vigencia',
  'Ubicación del riesgo',
  'Evento',
  'Interés afectado',
  'Deducible',
  'Infraseguro',
  'Reserva preliminar',
  'Concepto preliminar',
];

export const TIPOS_INFORME_PREVISORA = ['preliminar', 'final', 'unico'];

export function normalizarTipoInformePrevisora(valor, fallback = 'unico') {
  const t = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return fallback;
}

export function esInformePreliminarPrevisora(info = {}) {
  return normalizarTipoInformePrevisora(info?.tipoInforme, 'unico') === 'preliminar';
}

export function esInformeFinalPrevisora(info = {}) {
  return normalizarTipoInformePrevisora(info?.tipoInforme, 'unico') === 'final';
}

export function esInformeUnicoPrevisora(info = {}) {
  return normalizarTipoInformePrevisora(info?.tipoInforme, 'unico') === 'unico';
}

export function tipoInformeActualPrevisora(informe = null, caso = null) {
  if (informe?.tipoInforme) {
    return normalizarTipoInformePrevisora(informe.tipoInforme, 'unico');
  }
  if (caso?.informeUnico && typeof caso.informeUnico === 'object') {
    return normalizarTipoInformePrevisora(caso.informeUnico.tipoInforme, 'unico');
  }
  return 'unico';
}

export function etiquetaArchivoInformePrevisora(tipo) {
  const t = normalizarTipoInformePrevisora(tipo, 'unico');
  if (t === 'preliminar') return 'INFORME_PRELIMINAR';
  if (t === 'final') return 'INFORME_FINAL';
  return 'INFORME_UNICO';
}

export function etiquetaTituloInformePrevisora(tipo) {
  const t = normalizarTipoInformePrevisora(tipo, 'unico');
  if (t === 'preliminar') return 'PRELIMINAR';
  if (t === 'final') return 'FINAL';
  return 'ÚNICO';
}

export function etiquetaEncabezadoInformePrevisora(tipo) {
  const t = normalizarTipoInformePrevisora(tipo, 'unico');
  if (t === 'preliminar') return 'Informe Preliminar Previsora';
  if (t === 'final') return 'Informe Final Previsora';
  return 'Informe Único Previsora';
}

export function prefijoArchivoInformePrevisora(tipo) {
  const t = normalizarTipoInformePrevisora(tipo, 'unico');
  if (t === 'preliminar') return 'Informe_Preliminar_PREVISORA';
  if (t === 'final') return 'Informe_Final_PREVISORA';
  return 'Informe_Unico_PREVISORA';
}

export function etiquetaReporteCuadroPrevisora(tipo) {
  const t = normalizarTipoInformePrevisora(tipo, 'unico');
  if (t === 'preliminar') return 'Preliminar — Previsora';
  if (t === 'final') return 'Final — Previsora';
  return 'Único — Previsora';
}

export function reservaSugeridaPrevisora(info = {}) {
  return parsearNumero(info?.reservaSugerida);
}

export function plantillaFilasPolizaPrevisora() {
  return CONCEPTOS_POLIZA_PREVISORA.map((concepto, i) => ({
    id: `poliza-previsora-${i}`,
    concepto,
    analisis: '',
    conclusion: '',
  }));
}

function usarPlantillaSiVacio(filas, plantilla) {
  return Array.isArray(filas) && filas.length ? filas : plantilla;
}

export function defaultInformeUnicoPrevisora(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    tipoInforme: 'unico',
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_PREVISORA,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    reservaSugerida: caso.reserva || caso.valorReservaPreventivaPromedio || '',
    filasPolizaCobertura: plantillaFilasPolizaPrevisora(),
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    fotosCotizacion: serializarPaginasCotizacion(guardado?.fotosCotizacion),
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
    tipoInforme: normalizarTipoInformePrevisora(guardado.tipoInforme, 'unico'),
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
    reservaSugerida: guardado.reservaSugerida ?? base.reservaSugerida,
    filasPolizaCobertura: usarPlantillaSiVacio(
      guardado.filasPolizaCobertura,
      base.filasPolizaCobertura
    ),
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    fotosCotizacion: serializarPaginasCotizacion(guardado.fotosCotizacion),
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

function claveConceptoPolizaPrevisora(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function conceptoPolizaCoincidePrevisora(fila, ...needles) {
  const k = claveConceptoPolizaPrevisora(fila?.concepto);
  return needles.some((n) => k.includes(claveConceptoPolizaPrevisora(n)));
}

function filasPolizaSinTextoPrevisora(filas) {
  const arr = Array.isArray(filas) ? filas : [];
  if (!arr.length) return true;
  return arr.every(
    (f) => !String(f?.analisis || '').trim() && !String(f?.conclusion || '').trim()
  );
}

function fechaMsPrevisora(valor) {
  if (valor == null || valor === '') return null;
  const raw =
    typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : valor;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function textoAutoFilaPolizaPrevisora(fila, ctx = {}) {
  const caso = ctx.caso || {};
  const enc = ctx.encabezado || ctx.enc || {};
  const info = ctx.informe || {};
  const cobertura = String(
    caso.cobertura || caso.causa || enc.cobertura || enc.evento || 'TERREMOTO'
  ).trim();
  const direccion = String(info.direccionRiesgo || caso.direccionPredio || enc.direccion || '').trim();
  const ciudad = String(caso.ciudad || enc.ciudad || '').trim();
  const ini = caso.fechaInicioPoliza || enc.fechaInicioPoliza;
  const fin = caso.fechaFinPoliza || enc.fechaFinPoliza;
  const ocurrencia = caso.fechaSiniestro || enc.fechaSiniestro;
  const reserva =
    reservaSugeridaPrevisora(info) || parsearNumero(caso.reserva || caso.valorReservaPreventivaPromedio);

  if (conceptoPolizaCoincidePrevisora(fila, 'vigencia')) {
    if (ini || fin) {
      const periodo = `del ${formatDateLarga(ini)} al ${formatDateLarga(fin)}`;
      const ocMs = fechaMsPrevisora(ocurrencia);
      const iniMs = fechaMsPrevisora(ini);
      const finMs = fechaMsPrevisora(fin);
      const dentro =
        ocMs != null &&
        (iniMs == null || ocMs >= iniMs) &&
        (finMs == null || ocMs <= finMs + 24 * 60 * 60 * 1000);
      return {
        analisis: ocurrencia
          ? `El evento reclamado (${formatDateLarga(ocurrencia)}) se analiza frente a la vigencia de la póliza ${periodo}.`
          : `Vigencia de la póliza ${periodo}.`,
        conclusion: dentro || !ocurrencia ? 'Evento con cobertura.' : 'Verificar vigencia.',
      };
    }
    return {
      analisis: 'Pendiente confirmar las fechas de vigencia de la póliza.',
      conclusion: 'Por verificar.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'ubicacion')) {
    const lugar = [direccion, ciudad].filter(Boolean).join(', ');
    return {
      analisis: lugar
        ? `La inspección se realizó en el predio radicado en la póliza (${lugar}).`
        : 'La inspección se realizó en el predio radicado en la póliza.',
      conclusion: 'Evento con cobertura.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'evento')) {
    const fechaTxt = ocurrencia ? ` de fecha ${formatDateLarga(ocurrencia)}` : '';
    return {
      analisis: `${cobertura}${fechaTxt}.`,
      conclusion: `El asegurado tiene contratado el amparo de ${cobertura}.`,
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'interes')) {
    return {
      analisis:
        'El asegurado deberá aportar los documentos que demuestren la propiedad de los bienes afectados.',
      conclusion: 'Por verificar.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'deducible')) {
    const liq = ctx.liquidador || caso.liquidador || {};
    const textoCfg = String(
      liq?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.texto ||
        liq?.liquidacionCatastrofico?.deducible ||
        liq?.deducible ||
        ''
    ).trim();
    return {
      analisis: textoCfg
        ? `Deducible según condiciones de la póliza / liquidador: ${textoCfg}.`
        : 'Se aplicará el deducible pactado en la póliza al momento de liquidar la pérdida.',
      conclusion: 'Se aplicará al momento de liquidar la pérdida.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'infraseguro')) {
    return {
      analisis:
        'Se solicitarán inventarios y soportes de los bienes antes del evento para verificar posible infraseguro.',
      conclusion: 'A verificar.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'reserva')) {
    if (reserva > 0) {
      return {
        analisis: `Se recomendó $ ${formatearMonto(reserva)}, valoración inicial de la pérdida.`,
        conclusion: 'Podría ser modificada una vez se reciban los documentos solicitados.',
      };
    }
    return {
      analisis: 'Pendiente cuantificar la reserva preliminar.',
      conclusion: 'Por definir.',
    };
  }

  if (conceptoPolizaCoincidePrevisora(fila, 'concepto preliminar')) {
    return {
      analisis: 'Reclamo con cobertura.',
      conclusion: 'Esperar documentos solicitados.',
    };
  }

  return { analisis: '', conclusion: '' };
}

/**
 * Completa CONCEPTO / ANÁLISIS / CONCLUSIÓN con datos del caso,
 * sin pisar lo que el ajustador ya escribió.
 */
export function completarFilasPolizaCoberturaPrevisora(filas, ctx = {}) {
  const origen = filasPolizaSinTextoPrevisora(filas)
    ? plantillaFilasPolizaPrevisora()
    : [...(filas || [])];
  const porClave = new Map();
  origen.forEach((f) => {
    const k = claveConceptoPolizaPrevisora(f?.concepto);
    if (k && !porClave.has(k)) porClave.set(k, f);
  });

  const oficiales = CONCEPTOS_POLIZA_PREVISORA.map((concepto, i) => {
    const prev = porClave.get(claveConceptoPolizaPrevisora(concepto)) || {
      id: `poliza-previsora-${i}`,
      concepto,
      analisis: '',
      conclusion: '',
    };
    porClave.delete(claveConceptoPolizaPrevisora(concepto));
    const auto = textoAutoFilaPolizaPrevisora({ ...prev, concepto }, ctx);
    return {
      ...prev,
      concepto,
      analisis: String(prev.analisis || '').trim() || auto.analisis,
      conclusion: String(prev.conclusion || '').trim() || auto.conclusion,
    };
  });

  const extras = origen.filter((f) => {
    const k = claveConceptoPolizaPrevisora(f?.concepto);
    if (!k || !porClave.has(k)) return false;
    return String(f.analisis || '').trim() || String(f.conclusion || '').trim();
  });

  return [...oficiales, ...extras];
}
