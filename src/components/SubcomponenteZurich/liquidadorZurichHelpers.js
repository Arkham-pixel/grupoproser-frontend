import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import {
  estadoZurichPorTipoInforme,
  formatMiles,
  primeraFechaNoVaciaZurich,
  resolverDepartamentoZurich,
} from './zurichHelpers.js';
import { parsearNumero } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import { sanitizarInformeUnicoCamposWord } from '../../utils/limpiarTextoInformeWord.js';
import {
  aplicarRecargosEnEvaluacionNsr10,
  argsDeduciblesPorArticuloDiagrama,
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
  RECARGOS_PRESUPUESTO_NSR10_CAT,
  REGLAS_DEDUCIBLE_POR_COBERTURA,
  camposValorAseguradoParaNsr,
  parseMontoNsr10,
  resolverArticuloPolizaId,
  totalFilaPresupuesto,
  valoresAsegurablesDesdeLiquidador,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { defaultOtrosAmparos, normalizarOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';
import {
  fotosCotizacionDesdeLiquidador,
  serializarCotizacionPdf,
  serializarPaginasCotizacion,
  usaCotizacionComoBasePresupuesto,
  montoCotizacionPdf,
} from '../liquidacion/cotizacionPdfLiquidacion.js';

export { parsearNumero };

export const SMMLV_POR_ANIO = {
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

const REGLA_TERREMOTO = REGLAS_DEDUCIBLE_POR_COBERTURA.terremoto;

/** Zurich CAT = terremoto: mayor entre 3% del valor asegurable y 3 SMMLV. */
export const TEXTO_DEDUCIBLE_TERREMOTO_ZURICH =
  '3% del valor asegurable, mínimo 3 SMMLV (terremoto)';

export function pareceDeducibleGenericoCatZurich(cfg = {}) {
  if (!cfg || typeof cfg !== 'object') return true;
  const pct = Number(cfg.porcentaje);
  const cant = Number(cfg.cantidadSMMLV);
  if (!Number.isFinite(pct) || !Number.isFinite(cant)) return true;
  if (cant === 4) return true;
  if (pct === 10) return true;
  return cfg.porcentaje == null && cfg.cantidadSMMLV == null;
}

export function valorAseguradoPresupuestoZurich(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  return (
    parsearNumero(liq.valorAsegurado) ||
    parsearNumero(enc.valorAseguradoInmueble) ||
    0
  );
}

/**
 * Si hay valor asegurable, el 3% va sobre ese valor (tope: la pérdida).
 * Sin VA, el % se calcula sobre la pérdida para que el mínimo de 3 SMMLV sí aplique.
 */
export function configDeducibleTerremotoZurich(cfgActual = {}, { valorAsegurado = 0 } = {}) {
  const va = Number(valorAsegurado) || 0;
  return {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...(cfgActual && typeof cfgActual === 'object' ? cfgActual : {}),
    aplica: true,
    modo: REGLA_TERREMOTO.modo,
    porcentaje: REGLA_TERREMOTO.porcentaje,
    cantidadSMMLV: REGLA_TERREMOTO.cantidadSMMLV,
    tipoMinimo: REGLA_TERREMOTO.tipoMinimo,
    baseDeducible: va > 0 ? 'valor_asegurable' : 'perdida',
    texto: TEXTO_DEDUCIBLE_TERREMOTO_ZURICH,
  };
}

export function aplicarDeducibleTerremotoEnLiquidacionZurich(
  liquidacion = {},
  { valorAseguradoInmueble = 0, forzar = false } = {}
) {
  const liq = liquidacion && typeof liquidacion === 'object' ? { ...liquidacion } : {};
  const vaGuardado = parsearNumero(liq.valorAsegurado);
  const vaCaso = parsearNumero(valorAseguradoInmueble);
  const va = vaGuardado || vaCaso;
  if (!(vaGuardado > 0) && vaCaso > 0) {
    liq.valorAsegurado = vaCaso;
  }
  const cfgActual = liq.deducibleConfigPresupuesto || {};
  const yaEsTerremoto =
    Number(cfgActual.porcentaje) === REGLA_TERREMOTO.porcentaje &&
    Number(cfgActual.cantidadSMMLV) === REGLA_TERREMOTO.cantidadSMMLV;
  if (!forzar && !pareceDeducibleGenericoCatZurich(cfgActual) && !yaEsTerremoto) {
    return liq;
  }
  const cfgPres = configDeducibleTerremotoZurich(cfgActual, { valorAsegurado: va });
  return {
    ...liq,
    deducibleConfigPresupuesto: cfgPres,
    deducible: cfgPres.texto,
  };
}

export function migrarLiquidadorDeducibleTerremotoZurich(
  liquidador = {},
  caso = {},
  { forzar = false } = {}
) {
  const liq = liquidador && typeof liquidador === 'object' ? liquidador : {};
  return {
    ...liq,
    liquidacionCatastrofico: aplicarDeducibleTerremotoEnLiquidacionZurich(
      liq.liquidacionCatastrofico || {},
      {
        valorAseguradoInmueble:
          caso.valorAseguradoInmueble ?? liq.encabezado?.valorAseguradoInmueble,
        forzar,
      }
    ),
  };
}

/**
 * Zurich: el informe usa la misma fórmula que la plataforma (Liquidación presupuesto).
 * No se pisa % / SMMLV / base con la regla 3% / 3 SMMLV si el ajustador ya la cambió.
 */
export function configDeduciblePresupuestoParaCalculoZurich(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const va = valorAseguradoPresupuestoZurich(liquidador);
  const guardado =
    liq.deducibleConfigPresupuesto && typeof liq.deducibleConfigPresupuesto === 'object'
      ? liq.deducibleConfigPresupuesto
      : null;
  if (!guardado) {
    return configDeducibleTerremotoZurich({}, { valorAsegurado: va });
  }
  return {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...guardado,
    aplica: guardado.modo === 'no_aplica' ? false : guardado.aplica !== false,
  };
}

/** Desglose igual a «Liquidación presupuesto» en plataforma. */
export function desgloseDeducibleTerremotoZurich(liquidador = {}, diagrama = null) {
  const diag = diagrama || {};
  const pres = diag.deduciblePresupuesto || {};
  const cfg = configDeduciblePresupuestoParaCalculoZurich(liquidador);
  const va = valorAseguradoPresupuestoZurich(liquidador);
  const pctRaw = Number(pres.porcentaje);
  const cantRaw = Number(pres.cantidadSMMLV);
  const pct = Number.isFinite(pctRaw) && pctRaw > 0 ? pctRaw : Number(cfg.porcentaje) || REGLA_TERREMOTO.porcentaje;
  const cant =
    Number.isFinite(cantRaw) && cantRaw > 0
      ? cantRaw
      : Number(cfg.cantidadSMMLV) || REGLA_TERREMOTO.cantidadSMMLV;
  const montoPct = Number(pres.montoPctOVa) || 0;
  const montoSmmlv = Number(pres.montoSmmlv) || 0;
  const aplicado = Number(pres.aplicado) || 0;
  const neto = Number(pres.neto);
  const tipoGanador = pres.tipoGanadorLabel || (pres.ganaSmmlv ? 'SMMLV' : '%');
  const tieneArticulos = Boolean(pres.tieneArticulos);
  const etiquetaPct = 'DEDUCIBLE SOBRE PÉRDIDA O VALOR ASEGURABLE';
  const etiquetaSmmlv = tieneArticulos
    ? `DEDUCIBLE ${cant} SMMLV (no aplica)`
    : `DEDUCIBLE ${cant} SMMLV`;
  const etiquetaAplicado = tieneArticulos
    ? 'DEDUCIBLE APLICADO (por artículo)'
    : `DEDUCIBLE APLICADO (el mayor: ${tipoGanador})`;
  const etiquetaNeto = tieneArticulos ? 'VALOR A INDEMNIZAR' : 'PRESUPUESTO NETO';
  return {
    porcentaje: pct,
    cantidadSMMLV: cant,
    valorAsegurado: va,
    montoPct,
    montoSmmlv,
    aplicado,
    neto: Number.isFinite(neto) ? neto : 0,
    tipoGanador,
    tieneArticulos,
    etiquetaPct,
    etiquetaSmmlv,
    etiquetaAplicado,
    etiquetaNeto,
    texto:
      tieneArticulos
        ? 'El valor a indemnizar es la suma de (pérdida − deducible) de cada categoría. El deducible general (SMMLV / %) no se resta otra vez aquí.'
        : 'Las dos vías quedan habilitadas. Se resta el mayor entre SMMLV y el porcentaje sobre pérdida o valor asegurable.',
  };
}

/** Montos del resumen como en plataforma (decimales solo si existen). */
export function formatearMontoPlataformaZurich(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Filas del resumen de liquidación Zurich: mismas etiquetas y orden que
 * Subtotal / AIU + Liquidación presupuesto en la plataforma.
 */
export function filasResumenLiquidacionZurich(liquidador = {}, totales = {}) {
  const desglose = desgloseDeducibleTerremotoZurich(liquidador, totales.diagrama);
  const pres = liquidador?.evaluacionSismicaNSR10?.presupuesto || {};
  const aiuPct = Math.round((totales.presupuesto?.aiuPct ?? pres.aiuPorcentaje ?? 0.25) * 100);
  const imprPct = Math.round((totales.presupuesto?.imprPct ?? pres.imprevistosPorcentaje ?? 0) * 100);
  const impPct = Math.round((totales.presupuesto?.impPct ?? pres.impuestosPorcentaje ?? 0) * 100);
  const mostrarImprevistos = imprPct > 0 || Number(totales.imprevistos) > 0;
  const mostrarImpuestos = impPct > 0 || Number(totales.impuestos) > 0;
  const usaCotiz = totales.origenPresupuesto === 'cotizacion';
  const filas = [];

  if (usaCotiz) {
    filas.push({
      label: 'Total cotización de reparación (base de deducible)',
      value: totales.cotizacionMonto,
      bold: true,
    });
  } else {
    filas.push({
      label: 'Subtotal presupuesto (costo directo)',
      value: totales.subtotal,
    });
    filas.push({
      label: `AIU (${aiuPct}%)`,
      value: totales.aiu,
    });
    if (mostrarImprevistos) {
      filas.push({ label: `Imprevistos (${imprPct}%)`, value: totales.imprevistos });
    }
    if (mostrarImpuestos) {
      filas.push({ label: `Impuestos (${impPct}%)`, value: totales.impuestos });
    }
    filas.push({
      label: 'TOTAL PRESUPUESTO',
      value: totales.totalPresupuesto ?? totales.presupuesto?.total,
      bold: true,
    });
  }

  const contenidos = Number(totales.totalContenidos) || 0;
  if (contenidos > 0) {
    filas.push({ label: 'Total contenidos', value: contenidos });
    filas.push({
      label: 'SUMA COMPLETA (presupuesto + contenidos)',
      value: totales.sumaCompleta ?? totales.totalDanios,
      bold: true,
    });
  }

  filas.push({ label: desglose.etiquetaPct, value: desglose.montoPct });
  filas.push({ label: desglose.etiquetaSmmlv, value: desglose.montoSmmlv });
  filas.push({
    label: desglose.etiquetaAplicado,
    value: desglose.aplicado,
    bold: true,
  });
  filas.push({
    label: desglose.etiquetaNeto,
    value: desglose.neto,
    bold: true,
    destacado: true,
  });

  const hosp = Number(totales.diagrama?.gastosHospedaje) || 0;
  if (hosp > 0) {
    filas.push({ label: 'Gastos de hospedaje', value: hosp });
  }

  const deducibleContenidos = Number(totales.diagrama?.deducibleContenidos?.aplicado) || 0;
  if (deducibleContenidos > 0) {
    filas.push({ label: 'Deducible contenidos', value: deducibleContenidos });
  }

  if (Array.isArray(totales.otrosAmparos) && totales.otrosAmparos.length) {
    filas.push({
      label: 'Otros amparos (sin deducible)',
      value: totales.totalOtrosAmparos,
    });
    totales.otrosAmparos.forEach((it) => {
      const nom = String(it.nombre || it.tipo || '').trim() || 'Amparo';
      const obs = String(it.observacion || '').trim();
      filas.push({
        label: obs ? `${nom} — ${obs}` : nom,
        value: it.valor,
      });
    });
  }

  const totalInd = Number(totales.totalIndemnizar) || 0;
  const neto = Number(desglose.neto) || 0;
  if (Math.abs(totalInd - neto) > 0.05) {
    filas.push({
      label: 'TOTAL A INDEMNIZAR',
      value: totalInd,
      bold: true,
    });
  }

  return filas;
}

/** Texto fijo editable: información general del evento (informe preliminar Zurich). */
export const INFO_EVENTO_DEFAULT_ZURICH = `El presente informe se emite con base en la atención del siniestro reportado ante Zurich, la visita de inspección realizada al predio asegurado y la documentación aportada por el tomador/asegurado.

La evaluación busca verificar la existencia y alcance de los daños, contrastarlos con las coberturas de la póliza vigente y establecer, de manera preliminar, las pérdidas indemnizables conforme a las condiciones particulares del contrato de seguro.`;

export const NIVELES_AFECTACION_ZURICH = [
  'CRÍTICO',
  'ALTO',
  'MEDIO–ALTO',
  'MEDIO',
  'POR DEFINIR',
];

/** Zonas de la tabla de daños del informe preliminar Zurich. */
export const ZONAS_DANIOS_PRELIMINAR_ZURICH = [
  'Fachadas',
  'Zona de acceso',
  'Muros de mampostería',
  'Muros con grietas abiertas',
  'Encuentros muro–estructura',
  'Núcleo de escaleras',
  'Cielos rasos',
  'Cubiertas y elementos livianos',
  'Aulas, oficinas y archivos',
  'Pasillos y zonas comunes',
  'Pañetes, estucos y pintura',
  'Puertas, ventanería y elementos metálicos',
  'Instalaciones y equipos adosados',
  'Columnas, vigas y sistema aporticado visible',
];

export const CONCEPTOS_POLIZA_PRELIMINAR_ZURICH = [
  'Vigencia',
  'Modalidad de aseguramiento',
  'Evento',
  'Áreas comunes',
  'Áreas privadas',
  'Maquinaria y equipo',
  'Equipo electrónico',
  'Deducible terremoto',
  'Reserva preliminar',
];

export const CAPITULOS_PRESUPUESTO_PRELIMINAR_ZURICH = [
  '1. Preliminares, seguridad y protecciones',
  '2. Fachada – desmonte y reconstrucción de los dos últimos niveles',
  '3. Demolición y reconstrucción de mampostería interior',
  '4. Reparación de fisuras y grietas menores',
  '5. Pañetes, estucos y acabados de muros',
  '6. Pintura interior y exterior',
  '7. Cielos rasos y elementos suspendidos',
  '8. Cubiertas y estructura liviana asociada',
  '9. Carpintería metálica, ventanería, puertas y divisiones',
  '10. Instalaciones eléctricas e iluminación',
  '11. Aires acondicionados y redes complementarias',
  '12. Escaleras, circulaciones y zonas comunes',
  '13. Retiro y disposición de escombros',
  '14. Estudios, evaluación especializada y contingencias técnicas',
];

export function plantillaFilasDaniosZurich() {
  return [{ id: 'danio-0', zona: '', condicion: '', nivel: '' }];
}

export function plantillaFilasPolizaZurich() {
  return CONCEPTOS_POLIZA_PRELIMINAR_ZURICH.map((concepto, i) => ({
    id: `poliza-${i}`,
    concepto,
    analisis: '',
    conclusion: '',
  }));
}

function textoInforme(v) {
  return String(v ?? '').trim();
}

function claveConceptoPolizaZurich(valor) {
  return textoInforme(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function conceptoPolizaCoincide(fila, ...needles) {
  const k = claveConceptoPolizaZurich(fila?.concepto);
  if (!k) return false;
  return needles.some((n) => k.includes(claveConceptoPolizaZurich(n)));
}

function filasPolizaSinAnalisisZurich(filas) {
  if (!Array.isArray(filas) || !filas.length) return true;
  return filas.every(
    (f) => !textoInforme(f?.analisis) && !textoInforme(f?.conclusion)
  );
}

function itemsPolizaDesdeLiquidadorZurich(liquidador = {}) {
  const nsr = liquidador?.evaluacionSismicaNSR10 || {};
  return [
    ...(Array.isArray(nsr.contenidos?.items) ? nsr.contenidos.items : []),
    ...(Array.isArray(nsr.presupuesto?.items) ? nsr.presupuesto.items : []),
  ];
}

function resumenItemsPolizaZurich(items, pred) {
  const hits = (Array.isArray(items) ? items : []).filter(pred);
  if (!hits.length) return null;
  let valorAsegurable = 0;
  let perdida = 0;
  const nombres = [];
  hits.forEach((it) => {
    valorAsegurable += parseMontoNsr10(it?.valorAsegurable) || 0;
    perdida += Number(totalFilaPresupuesto(it)) || 0;
    const nom = textoInforme(it?.articulo || it?.actividad || it?.categoria);
    if (nom && !nombres.includes(nom)) nombres.push(nom);
  });
  return { valorAsegurable, perdida, n: hits.length, nombres };
}

function textoResumenArticuloZurich(resumen, etiqueta) {
  if (!resumen) return { analisis: '', conclusion: '' };
  const partes = [];
  if (resumen.valorAsegurable > 0) {
    partes.push(
      `Valor asegurable registrado en Presupuesto / contenidos: $ ${formatearMonto(resumen.valorAsegurable)}.`
    );
  }
  if (resumen.perdida > 0) {
    partes.push(`Pérdida identificada en ítems: $ ${formatearMonto(resumen.perdida)}.`);
  }
  if (resumen.nombres.length) {
    partes.push(`Ítems: ${resumen.nombres.slice(0, 6).join('; ')}.`);
  }
  if (!partes.length) {
    partes.push(
      `En Gestionar / Presupuesto hay ${resumen.n} ítem(s) asociados a ${etiqueta}.`
    );
  }
  return {
    analisis: partes.join(' '),
    conclusion: resumen.valorAsegurable > 0 || resumen.perdida > 0 ? 'AMPARADO' : 'REVISAR',
  };
}

function autoAnalisisConceptoZurich(fila, ctx) {
  const caso = ctx.caso || {};
  const enc = ctx.encabezado || {};
  const info = ctx.informe || {};
  const liq = ctx.liquidador || {};
  const poliza = textoInforme(caso.numeroPoliza || enc.poliza);
  const tomador = textoInforme(caso.tomador || enc.tomador);
  const cobertura = textoInforme(caso.cobertura || enc.cobertura || enc.evento);
  const direccion = textoInforme(caso.direccionPredio || enc.direccion || info.direccionRiesgo);
  const ciudad = textoInforme(caso.ciudad || enc.ciudad);
  const depto = textoInforme(
    caso.departamento || enc.departamento || resolverDepartamentoZurich(caso)
  );
  const ini = caso.fechaInicioPoliza || enc.fechaInicioPoliza;
  const fin = caso.fechaFinPoliza || enc.fechaFinPoliza;
  const items = itemsPolizaDesdeLiquidadorZurich(liq);

  if (conceptoPolizaCoincide(fila, 'vigencia')) {
    if (ini || fin) {
      const periodo = `del ${formatDateLarga(ini)} al ${formatDateLarga(fin)}`;
      return {
        analisis: `${poliza ? `Póliza ${poliza}. ` : ''}${tomador ? `Tomador: ${tomador}. ` : ''}Vigencia ${periodo}, según ficha de Gestionar.`,
        conclusion: 'EN VIGENCIA',
      };
    }
    if (poliza) {
      return {
        analisis: `Póliza ${poliza}${tomador ? `, tomador ${tomador}` : ''}. Las fechas de vigencia no constan en Gestionar.`,
        conclusion: 'PENDIENTE VIGENCIA',
      };
    }
    return { analisis: '', conclusion: '' };
  }

  if (conceptoPolizaCoincide(fila, 'modalidad')) {
    const vaInm = parsearNumero(caso.valorAseguradoInmueble || enc.valorAseguradoInmueble);
    const vaCont = parsearNumero(caso.valorAseguradoContenidos || enc.valorAseguradoContenidos);
    const partes = [];
    if (vaInm > 0) partes.push(`valor asegurado inmueble $ ${formatearMonto(vaInm)}`);
    if (vaCont > 0) partes.push(`contenidos $ ${formatearMonto(vaCont)}`);
    if (!partes.length) return { analisis: '', conclusion: '' };
    return {
      analisis: `Según Gestionar se registra ${partes.join(' y ')}.`,
      conclusion: 'SEGÚN PÓLIZA / GESTIONAR',
    };
  }

  if (conceptoPolizaCoincide(fila, 'evento')) {
    if (!cobertura) return { analisis: '', conclusion: '' };
    return {
      analisis: `El expediente (Gestionar) registra cobertura / evento ${cobertura}.`,
      conclusion: 'EVENTO AMPARADO',
    };
  }

  if (conceptoPolizaCoincide(fila, 'ubicacion')) {
    const lugar = [direccion, [ciudad, depto].filter(Boolean).join(' / ')].filter(Boolean).join('. ');
    if (!lugar) return { analisis: '', conclusion: '' };
    return {
      analisis: `Ubicación del riesgo según Gestionar: ${lugar}.`,
      conclusion: 'RIESGO IDENTIFICADO',
    };
  }

  if (conceptoPolizaCoincide(fila, 'areas comunes', 'area comun')) {
    return textoResumenArticuloZurich(
      resumenItemsPolizaZurich(
        items,
        (it) => /comun/i.test(`${it?.articulo || ''} ${it?.categoria || ''} ${it?.actividad || ''} ${it?.capitulo || ''}`)
      ),
      'áreas comunes'
    );
  }

  if (conceptoPolizaCoincide(fila, 'areas privadas', 'area privada')) {
    return textoResumenArticuloZurich(
      resumenItemsPolizaZurich(
        items,
        (it) =>
          /privat|apartamento|\bapto\.?\b/i.test(
            `${it?.articulo || ''} ${it?.categoria || ''} ${it?.actividad || ''} ${it?.observacion || ''}`
          )
      ),
      'áreas privadas'
    );
  }

  if (conceptoPolizaCoincide(fila, 'maquinaria')) {
    return textoResumenArticuloZurich(
      resumenItemsPolizaZurich(
        items,
        (it) =>
          resolverArticuloPolizaId(it) === 'poliza_maquinaria' ||
          /maquinaria/i.test(`${it?.articulo || ''} ${it?.categoria || ''}`)
      ),
      'maquinaria y equipo'
    );
  }

  if (conceptoPolizaCoincide(fila, 'equipo electronico', 'electronico', 'electrico y electronico')) {
    return textoResumenArticuloZurich(
      resumenItemsPolizaZurich(
        items,
        (it) =>
          resolverArticuloPolizaId(it) === 'poliza_eee_fijo' ||
          /electr[oó]nico/i.test(`${it?.articulo || ''} ${it?.categoria || ''}`)
      ),
      'equipo electrónico'
    );
  }

  if (conceptoPolizaCoincide(fila, 'deducible')) {
    const textoCfg =
      textoInforme(liq?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.texto) ||
      textoInforme(liq?.deducible) ||
      TEXTO_DEDUCIBLE_TERREMOTO_ZURICH;
    return {
      analisis: `Condición de deducible tomada de Gestionar / liquidador: ${textoCfg}.`,
      conclusion: textoCfg,
    };
  }

  if (conceptoPolizaCoincide(fila, 'reserva')) {
    const reserva = reservaSugeridaZurich(info) || parsearNumero(caso.reserva);
    if (!(reserva > 0)) return { analisis: '', conclusion: '' };
    return {
      analisis: `Reserva preliminar según presupuesto / ficha de Gestionar: $ ${formatearMonto(reserva)}.`,
      conclusion: `$ ${formatearMonto(reserva)}`,
    };
  }

  return { analisis: '', conclusion: '' };
}

/**
 * Completa filas de análisis de póliza con datos de Gestionar (ficha + Presupuesto)
 * sin pisar texto que el ajustador ya haya escrito.
 */
export function completarFilasPolizaCoberturaZurich(filas, ctx = {}) {
  const origen = filasPolizaSinAnalisisZurich(filas) ? plantillaFilasPolizaZurich() : [...filas];
  const vistos = new Set(origen.map((f) => claveConceptoPolizaZurich(f?.concepto)).filter(Boolean));
  CONCEPTOS_POLIZA_PRELIMINAR_ZURICH.forEach((concepto) => {
    const k = claveConceptoPolizaZurich(concepto);
    if (!vistos.has(k)) {
      origen.push({
        id: `poliza-${k.replace(/\s+/g, '-')}`,
        concepto,
        analisis: '',
        conclusion: '',
      });
      vistos.add(k);
    }
  });

  const items = itemsPolizaDesdeLiquidadorZurich(ctx.liquidador || ctx.caso?.liquidador || {});
  const extraElectronico = resumenItemsPolizaZurich(
    items,
    (it) =>
      resolverArticuloPolizaId(it) === 'poliza_eee_fijo' ||
      /electr[oó]nico/i.test(`${it?.articulo || ''} ${it?.categoria || ''}`)
  );
  if (extraElectronico && !vistos.has(claveConceptoPolizaZurich('Equipo electrónico'))) {
    origen.push({
      id: 'poliza-equipo-electronico',
      concepto: 'Equipo electrónico',
      analisis: '',
      conclusion: '',
    });
  }

  return origen.map((fila) => {
    const auto = autoAnalisisConceptoZurich(fila, {
      caso: ctx.caso || {},
      encabezado: ctx.encabezado || {},
      informe: ctx.informe || {},
      liquidador: ctx.liquidador || ctx.caso?.liquidador || {},
    });
    return {
      ...fila,
      concepto: textoInforme(fila?.concepto) || auto.concepto || '',
      analisis: textoInforme(fila?.analisis) || auto.analisis,
      conclusion: textoInforme(fila?.conclusion) || auto.conclusion,
    };
  });
}

export function plantillaFilasPresupuestoPreliminarZurich() {
  return [{ id: 'cap-0', capitulo: '', descripcion: '', valor: '' }];
}

export const TIPOS_INFORME_ZURICH = ['preliminar', 'final', 'unico'];

export function normalizarTipoInformeZurich(valor, fallback = 'preliminar') {
  const t = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return fallback;
}

export function esInformePreliminarZurich(info = {}) {
  return normalizarTipoInformeZurich(info?.tipoInforme, 'preliminar') === 'preliminar';
}

/** Final y único incluyen liquidador; el preliminar no. */
export function esInformeConLiquidadorZurich(info = {}) {
  const t = normalizarTipoInformeZurich(info?.tipoInforme, 'preliminar');
  return t === 'final' || t === 'unico';
}

/** Tipo vigente: el del borrador en pantalla, o el guardado en el caso. */
export function tipoInformeActualZurich(informe = null, caso = null) {
  if (informe?.tipoInforme) {
    return normalizarTipoInformeZurich(informe.tipoInforme, 'preliminar');
  }
  if (caso?.informeUnico && typeof caso.informeUnico === 'object') {
    return normalizarTipoInformeZurich(caso.informeUnico.tipoInforme, 'unico');
  }
  return 'preliminar';
}

/** Fusiona un borrador de informe sobre el caso para hidratar al reabrir pestañas. */
export function casoZurichConInforme(caso = {}, informe = null) {
  if (!informe || typeof informe !== 'object') return caso || {};
  return {
    ...(caso || {}),
    informeUnico: { ...(caso?.informeUnico || {}), ...informe },
  };
}

export function etiquetaArchivoInformeZurich(tipo) {
  const t = normalizarTipoInformeZurich(tipo, 'unico');
  if (t === 'preliminar') return 'INFORME_PRELIMINAR';
  if (t === 'final') return 'INFORME_FINAL';
  return 'INFORME_UNICO';
}

export function etiquetaTituloInformeZurich(tipo) {
  const t = normalizarTipoInformeZurich(tipo, 'preliminar');
  if (t === 'preliminar') return 'PRELIMINAR';
  if (t === 'final') return 'FINAL';
  return 'ÚNICO';
}

export function etiquetaEncabezadoInformeZurich(tipo) {
  const t = normalizarTipoInformeZurich(tipo, 'preliminar');
  if (t === 'preliminar') return 'Informe Preliminar Zurich';
  if (t === 'final') return 'Informe Final Zurich';
  return 'Informe Único Zurich';
}

export function prefijoArchivoInformeZurich(tipo) {
  const t = normalizarTipoInformeZurich(tipo, 'preliminar');
  if (t === 'preliminar') return 'Informe_Preliminar_Zurich';
  if (t === 'final') return 'Informe_Final_Zurich';
  return 'Informe_Unico_Zurich';
}

export function etiquetaReporteCuadroZurich(tipo) {
  const t = normalizarTipoInformeZurich(tipo, 'preliminar');
  if (t === 'preliminar') return 'Preliminar — Zurich';
  if (t === 'final') return 'Final — Zurich';
  return 'Único — Zurich';
}

export function totalPresupuestoPreliminarZurich(filas = []) {
  return (Array.isArray(filas) ? filas : []).reduce(
    (acc, fila) => acc + parsearNumero(fila?.valor),
    0
  );
}

export function reservaSugeridaZurich(info = {}) {
  const delPresupuesto = totalPresupuestoPreliminarZurich(info?.filasPresupuestoPreliminar);
  if (delPresupuesto > 0) return delPresupuesto;
  return parsearNumero(info?.reservaSugerida);
}

function usarPlantillaSiVacio(filas, plantilla) {
  return Array.isArray(filas) && filas.length ? filas : plantilla;
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
export function crearItemZurich(item = '', valor = '', id) {
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
    return crearItemZurich(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemZurich(it.concepto || '', valor, it.id);
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

/**
 * Completa fechaInformePreliminar o fechaInformeFinal si aún están vacías.
 * El informe único/final usa la fecha de informe final y avanza el estado a LIQUIDAR.
 */
export function fechasInformeParaCasoZurich(informe = {}, casoBase = {}) {
  const tipo = normalizarTipoInformeZurich(informe?.tipoInforme, 'preliminar');
  const fechaFuente = fechaInput(informe?.fechaInforme) || fechaInput(new Date());
  const patch = {};
  if (tipo === 'preliminar') {
    if (!casoBase.fechaInformePreliminar) patch.fechaInformePreliminar = fechaFuente;
  } else if (!casoBase.fechaInformeFinal) {
    patch.fechaInformeFinal = fechaFuente;
  }
  const estado = estadoZurichPorTipoInforme(informe?.tipoInforme, casoBase.estado);
  if (estado && estado !== casoBase.estado) patch.estado = estado;
  return patch;
}

/** Copia tomador/dirección/vigencia/cobertura del encabezado al caso (sin borrar lo ya guardado). */
export function camposPolizaParaCasoZurich(fuente = {}, casoBase = {}) {
  const enc =
    fuente?.encabezado && typeof fuente.encabezado === 'object' ? fuente.encabezado : fuente || {};
  const pick = (a, b) => {
    const ta = String(a ?? '').trim();
    if (ta) return ta;
    const tb = String(b ?? '').trim();
    return tb || null;
  };
  return {
    tomador: pick(enc.tomador, casoBase.tomador),
    direccionPredio: pick(
      enc.direccion || enc.direccionRiesgo || enc.direccionPredio,
      casoBase.direccionPredio
    ),
    cobertura: pick(enc.cobertura || enc.evento, casoBase.cobertura),
    departamento: pick(enc.departamento, casoBase.departamento),
    fechaInicioPoliza: enc.fechaInicioPoliza || casoBase.fechaInicioPoliza || null,
    fechaFinPoliza: enc.fechaFinPoliza || casoBase.fechaFinPoliza || null,
  };
}

export function liquidacionCatastroficoDefaultZurich(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
      : '';
  const cfgPres = configDeducibleTerremotoZurich(
    {},
    { valorAsegurado: Number(va) || 0 }
  );
  return {
    valorAsegurado: va,
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: TEXTO_DEDUCIBLE_TERREMOTO_ZURICH,
    deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    deducibleConfigPresupuesto: cfgPres,
  };
}

export function encabezadoDesdecasoZurich(caso = {}) {
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
    departamento: resolverDepartamentoZurich(c),
    cobertura: c.cobertura || '',
    evento: c.cobertura || 'TERREMOTO',
    fechaInicioPoliza: fechaInput(c.fechaInicioPoliza),
    fechaFinPoliza: fechaInput(c.fechaFinPoliza),
    ajustador: c.ajustador || '',
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
    valorAseguradoContenidos: c.valorAseguradoContenidos ?? '',
  };
}

/** Rellena huecos del encabezado con la ficha (Gestionar) sin borrar lo ya escrito. */
export function fusionarEncabezadoDesdeFichaZurich(liquidador, caso) {
  const prev = liquidador && typeof liquidador === 'object' ? liquidador : {};
  const prevEnc = prev.encabezado && typeof prev.encabezado === 'object' ? prev.encabezado : {};
  const desdeFicha = encabezadoDesdecasoZurich(caso || {});
  const nextEnc = { ...desdeFicha };
  for (const [k, v] of Object.entries(prevEnc)) {
    if (String(v ?? '').trim()) nextEnc[k] = v;
  }
  const claves = new Set([...Object.keys(prevEnc), ...Object.keys(nextEnc)]);
  let igual = true;
  for (const k of claves) {
    if (String(prevEnc[k] ?? '') !== String(nextEnc[k] ?? '')) {
      igual = false;
      break;
    }
  }
  if (igual) return prev;
  return { ...prev, encabezado: nextEnc };
}

/** Prefill portada NSR desde caso Zurich */
export function prefillNsrDesdecasoZurich(caso = {}, encabezado = {}) {
  return {
    fechaInspeccion: fechaInput(
      primeraFechaNoVaciaZurich(
        caso.fechaInspeccion,
        caso.fechaVisita,
        caso.fechaInspeccionado,
        caso.fechaCoordinandoInspeccion
      )
    ),
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

export const DEFAULT_LIQUIDADOR_Zurich = {
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
    fechaInicioPoliza: '',
    fechaFinPoliza: '',
    ajustador: '',
    valorAseguradoInmueble: '',
    valorAseguradoContenidos: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultZurich(),
  indemnizacionSugerida: '',
  observaciones: '',
  cotizacionPdf: null,
};

export function esLiquidadorNsrZurich(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales Zurich = presupuesto NSR-10 + contenidos + diagrama (suma + hospedaje).
 * Compat: expone totalIndemnizar / totalIndemnizable para finiquito e informe.
 */
export function calcularLiquidacionZurich(liquidador = {}) {
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
    valorAsegurado: valorAseguradoPresupuestoZurich(liquidador),
    totalDanios: sumaCompleta,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: liq.deducibleConfig,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || liq.deducibleConfig,
    deducibleConfigPresupuesto: configDeduciblePresupuestoParaCalculoZurich(liquidador),
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
    deducibleTexto: desgloseDeducibleTerremotoZurich(liquidador, diagrama).texto,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: totalPresupuesto,
    diferencia: Math.round(
      ((parsearNumero(liquidador.valorReclamadoCaso) || sumaCompleta) -
        (diagrama.totalIndemnizar || 0)) *
        100
    ) / 100,
    usaSMMLV: Boolean(diagrama.deducibleUsaMinimo && diagrama.deducibleTipoMinimo === 'SMMLV'),
    totalOtrosAmparos: diagrama.totalOtrosAmparos || 0,
    otrosAmparos: diagrama.otrosAmparos || [],
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosZurich(liquidador = {}) {
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

export function mapcasoZurichALiquidador(caso = {}) {
  const encabezado = encabezadoDesdecasoZurich(caso);
  const prefill = prefillNsrDesdecasoZurich(caso, encabezado);
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill, {
    recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT,
  });
  const base = {
    ...DEFAULT_LIQUIDADOR_Zurich,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: aplicarDeducibleTerremotoEnLiquidacionZurich(
      liquidacionCatastroficoDefaultZurich(caso),
      { valorAseguradoInmueble: caso.valorAseguradoInmueble }
    ),
    otrosAmparos: defaultOtrosAmparos(),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrZurich(guardado)) {
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
    liquidacionCatastrofico: aplicarDeducibleTerremotoEnLiquidacionZurich(
      {
        ...base.liquidacionCatastrofico,
        ...(guardado.liquidacionCatastrofico || {}),
      },
      {
        valorAseguradoInmueble:
          encabezado.valorAseguradoInmueble ?? caso.valorAseguradoInmueble,
      }
    ),
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
    otrosAmparos: Array.isArray(guardado.otrosAmparos)
      ? normalizarOtrosAmparos(guardado.otrosAmparos)
      : defaultOtrosAmparos(),
    cotizacionPdf: guardado.cotizacionPdf || null,
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorZurich(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoZurich(caso, enc),
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

function esFotoArchivoZurich(a) {
  const et = String(a?.etiqueta || '').toUpperCase();
  const nombre = String(a?.nombreOriginal || a?.nombreArchivo || a?.nombre || '');
  if (et === 'COTIZACION') return false;
  return (
    et === 'FOTOS' ||
    et === 'INSPECCION' ||
    et.startsWith('FOTO_') ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(nombre) ||
    String(a?.tipoMime || '').startsWith('image/')
  );
}

/** Quita File/blob del informe para persistir solo metadatos en Mongo. */
export function serializarFotosInspeccionZurich(fotos = []) {
  return (Array.isArray(fotos) ? fotos : [])
    .map((f, i) => ({
      _id: f?._id ? String(f._id) : undefined,
      ruta: typeof f?.ruta === 'string' ? f.ruta : '',
      nombre: String(f?.nombre || f?.nombreOriginal || `Foto ${i + 1}`),
      nombreOriginal: String(f?.nombreOriginal || f?.nombre || `Foto ${i + 1}`),
      descripcion: String(f?.descripcion || ''),
      tipoMime: String(f?.tipoMime || ''),
      etiqueta: String(f?.etiqueta || 'FOTOS'),
      orden: Number.isFinite(Number(f?.orden)) ? Number(f.orden) : i,
    }))
    .filter((f) => f.ruta || f._id);
}

export function sanitizarInformeUnicoZurich(informe = {}) {
  if (!informe || typeof informe !== 'object') return {};
  const limpio = sanitizarInformeUnicoCamposWord(informe);
  const tipo = limpio.tipoInforme
    ? normalizarTipoInformeZurich(limpio.tipoInforme, 'preliminar')
    : undefined;
  return {
    ...limpio,
    ...(tipo ? { tipoInforme: tipo } : {}),
    fotosInspeccion: serializarFotosInspeccionZurich(limpio.fotosInspeccion),
    fotosCotizacion: serializarPaginasCotizacion(limpio.fotosCotizacion),
  };
}

/** Quita File/blob/preview del liquidador antes de guardar en Mongo. */
export function sanitizarLiquidadorZurich(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return liquidador;
  return {
    ...liquidador,
    cotizacionPdf: serializarCotizacionPdf(liquidador.cotizacionPdf),
  };
}

/** Galería del informe: fotosInspeccion + archivos FOTOS del caso. */
export function fotosInformeDesdeCasoZurich(caso = {}, guardado = null) {
  const delCaso = (Array.isArray(caso?.archivos) ? caso.archivos : [])
    .filter(esFotoArchivoZurich)
    .sort((a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0))
    .map((a, i) => ({
      _id: a._id,
      ruta: a.ruta,
      nombre: a.nombreOriginal || a.nombre || `Foto ${i + 1}`,
      nombreOriginal: a.nombreOriginal || a.nombre,
      descripcion: a.descripcion || '',
      tipoMime: a.tipoMime,
      etiqueta: a.etiqueta || 'FOTOS',
      orden: a.orden ?? i,
    }));
  const byId = new Map(delCaso.filter((a) => a?._id).map((a) => [String(a._id), a]));
  const byRuta = new Map(delCaso.filter((a) => a?.ruta).map((a) => [String(a.ruta), a]));

  // Completa leyenda desde archivos del caso (p. ej. descripción escrita en CAT).
  const delInforme = Array.isArray(guardado?.fotosInspeccion)
    ? guardado.fotosInspeccion
        .filter((f) => f && (f.ruta || f._id || f.preview || f.file))
        .map((f) => {
          const arch =
            (f._id && byId.get(String(f._id))) ||
            (f.ruta && byRuta.get(String(f.ruta))) ||
            null;
          return {
            ...f,
            descripcion:
              String(f.descripcion || '').trim() ||
              String(arch?.descripcion || '').trim() ||
              '',
            ruta: f.ruta || arch?.ruta || '',
            nombre: f.nombre || f.nombreOriginal || arch?.nombre || arch?.nombreOriginal,
            nombreOriginal:
              f.nombreOriginal || f.nombre || arch?.nombreOriginal || arch?.nombre,
            tipoMime: f.tipoMime || arch?.tipoMime || '',
          };
        })
    : [];
  if (!delInforme.length) return delCaso;
  const keys = new Set(delInforme.map((f) => String(f._id || f.ruta || '')).filter(Boolean));
  const extra = delCaso.filter((f) => !keys.has(String(f._id || f.ruta || '')));
  return [...delInforme, ...extra];
}

export function defaultInformeUnicoZurich(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    tipoInforme: 'preliminar',
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_ZURICH,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    reservaSugerida: caso.reserva != null && caso.reserva !== '' ? String(caso.reserva) : '',
    filasDanios: plantillaFilasDaniosZurich(),
    filasPolizaCobertura: completarFilasPolizaCoberturaZurich(plantillaFilasPolizaZurich(), {
      caso,
      encabezado: encabezadoDesdecasoZurich(caso),
      informe: {},
      liquidador: caso.liquidador,
    }),
    filasPresupuestoPreliminar: plantillaFilasPresupuestoPreliminarZurich(),
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: fotosInformeDesdeCasoZurich(caso, guardado),
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
    actaAjustadorNombre: caso.ajustador || '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    firmaAjustador: '',
  };
  if (!guardado) return base;
  return sanitizarInformeUnicoCamposWord({
    ...base,
    ...guardado,
    tipoInforme: guardado
      ? normalizarTipoInformeZurich(guardado.tipoInforme, 'unico')
      : 'preliminar',
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
    reservaSugerida: guardado.reservaSugerida ?? base.reservaSugerida,
    filasDanios: usarPlantillaSiVacio(guardado.filasDanios, base.filasDanios),
    filasPolizaCobertura: completarFilasPolizaCoberturaZurich(
      usarPlantillaSiVacio(guardado.filasPolizaCobertura, base.filasPolizaCobertura),
      {
        caso,
        encabezado: encabezadoDesdecasoZurich(caso),
        informe: guardado,
        liquidador: caso.liquidador,
      }
    ),
    filasPresupuestoPreliminar: usarPlantillaSiVacio(
      guardado.filasPresupuestoPreliminar,
      base.filasPresupuestoPreliminar
    ),
    fotosInspeccion: fotosInformeDesdeCasoZurich(caso, guardado),
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
  });
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
