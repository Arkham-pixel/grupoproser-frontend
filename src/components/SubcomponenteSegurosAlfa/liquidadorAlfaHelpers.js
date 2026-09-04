import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './segurosAlfaHelpers.js';
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
import {
  patchDeducibleDesdeTomadorAlfa,
  resolverReglaDeducibleTomadorAlfa,
} from './tomadoresAlfaCatalogo.js';
import {
  defaultOtrosAmparos as defaultOtrosAmparosAlfa,
  filasOtrosAmparosActivos as filasOtrosAmparosActivosAlfa,
  normalizarOtrosAmparos as normalizarOtrosAmparosAlfa,
  sumarOtrosAmparos as sumarOtrosAmparosAlfa,
  textoResumenOtrosAmparos as textoResumenOtrosAmparosAlfa,
} from '../liquidacion/otrosAmparosLiquidacion.js';
import { fotosInformeDesdeCaso } from '../fotosInformeUnicoHelpers.js';
import {
  normalizarCotizacionesPdfAlfa,
  resumenCotizacionesPdfAlfa,
  serializarCotizacionesPdfAlfa,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import { scoreContenidoLiquidadorNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';

/** AIU del FORMATO LIQUIDACIÓN Alfa (único recargo; sin imprevistos NSR ocultos). */
export const AIU_PORCENTAJE_DEFAULT_ALFA = 0.2;
export const IMPREVISTOS_PORCENTAJE_DEFAULT_ALFA = 0;
export const IMPUESTOS_PORCENTAJE_DEFAULT_ALFA = 0;
/** Default anterior (15%) — se migra automáticamente al nuevo 20%. */
const AIU_PORCENTAJE_LEGACY_ALFA = 0.15;

export const SMMLV_POR_ANIO = {
  2018: 781242,
  2019: 828116,
  2020: 877803,
  2021: 908526,
  2022: 1000000,
  2023: 1160000,
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const ANIOS_SMMLV = Object.keys(SMMLV_POR_ANIO)
  .map(Number)
  .sort((a, b) => b - a);
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

/** Texto fijo editable: información general del evento (consolidado terremoto Alfa). */
export const INFO_EVENTO_DEFAULT_ALFA = `Contexto general del evento sísmico

El 10 de agosto de 2026 se registró en Colombia un sismo de magnitud 7,4, con epicentro en San José del Palmar, Chocó, el cual fue percibido ampliamente en diferentes regiones del país, especialmente en el suroccidente y el Eje Cafetero.

El movimiento generó afectaciones en edificaciones, viviendas e infraestructura, con reportes de daños de distinta severidad en ciudades como Cali, Pereira, Manizales y Armenia, entre otros municipios cercanos a la zona de influencia.

Posterior al evento principal se han presentado diferentes réplicas, por lo que las autoridades y organismos técnicos han mantenido labores de inspección y evaluación de las construcciones afectadas, con el propósito de identificar posibles condiciones de riesgo y determinar su seguridad para la ocupación.

Este evento sísmico constituye el antecedente general bajo el cual se desarrollan las inspecciones y evaluaciones de daños objeto del presente informe.`;

export function pesosEnterosAlfa(valor) {
  if (valor == null || valor === '') return null;
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1_000_000_000) return Math.round(n / 100);
  return Math.round(n);
}

/** Si el candidato está inflado ×10 o ×100 vs la referencia del liquidador, usa la referencia. */
export function elegirMontoSinInflarAlfa(candidato, referencia) {
  const a = Number(typeof candidato === 'number' ? candidato : parsearNumero(candidato));
  const b = Number(typeof referencia === 'number' ? referencia : parsearNumero(referencia));
  if (Number.isFinite(b) && b > 0 && Number.isFinite(a) && a > 0) {
    const ratio = a / b;
    const cerca = (factor) => Math.abs(a / factor - b) / Math.max(b, 1) < 0.2;
    if (ratio > 50 && ratio < 150 && cerca(100)) return b;
    if (ratio > 5 && ratio < 15 && cerca(10)) return b;
  }
  if (Number.isFinite(a) && a > 0) return a;
  if (Number.isFinite(b) && b > 0) return b;
  return 0;
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

/**
 * Hospedaje real del Formato CAT: descripción de alojamiento, o id hospedaje
 * sin otra descripción (fila fantasma del 1% SID). Un ítem de catálogo que
 * reutilizó id "hospedaje" (demolición, cerámica, etc.) NO cuenta.
 */
export function esFilaHospedajeAlfa(it = {}) {
  const blob = [it?.descripcion, it?.actividad, it?.componente, it?.concepto, it?.item, it?.capitulo]
    .map((x) => String(x || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
  if (blob.includes('hospedaje') || blob.includes('alojamiento temporal')) return true;
  const descPropia = String(it?.descripcion || it?.actividad || '').trim();
  return String(it?.id || '').toLowerCase() === 'hospedaje' && !descPropia;
}

/** Si el usuario pisó la fila auto-hospedaje con un ítem real, cambia el id. */
export function retagFilaHospedajeSiItemReal(it = {}) {
  if (!it || typeof it !== 'object') return it;
  if (String(it.id || '') !== 'hospedaje') return it;
  if (esFilaHospedajeAlfa(it)) return it;
  return { ...it, id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
}

export function formatearMonto(valor, { decimals = 0 } = {}) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export {
  TIPOS_OTROS_AMPAROS as TIPOS_OTROS_AMPAROS_ALFA,
  UNIDADES_OTROS_AMPAROS as UNIDADES_OTROS_AMPAROS_ALFA,
  nombreTipoOtroAmparo as nombreTipoOtroAmparoAlfa,
  nuevoOtroAmparo as nuevoOtroAmparoAlfa,
  defaultOtrosAmparos as defaultOtrosAmparosAlfa,
  recalcularValorOtroAmparo as recalcularValorOtroAmparoAlfa,
  valorMostrarOtroAmparo as valorMostrarOtroAmparoAlfa,
  normalizarUnidadOtroAmparo as normalizarUnidadOtroAmparoAlfa,
  normalizarOtrosAmparos as normalizarOtrosAmparosAlfa,
  esOtroAmparoActivo as esOtroAmparoActivoAlfa,
  filasOtrosAmparosActivos as filasOtrosAmparosActivosAlfa,
  sumarOtrosAmparos as sumarOtrosAmparosAlfa,
  textoResumenOtrosAmparos as textoResumenOtrosAmparosAlfa,
} from '../liquidacion/otrosAmparosLiquidacion.js';

/** @deprecated compat — ítems FDM ya no se usan en el flujo activo */
export function crearItemAlfa(item = '', valor = '', id) {
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
    return crearItemAlfa(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemAlfa(it.concepto || '', valor, it.id);
}

const fechaInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  // Fechas ISO UTC (p. ej. 2026-08-10T00:00:00.000Z) → día calendario, sin -1 por zona horaria
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export function liquidacionCatastroficoDefaultAlfa(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  // Liquidación Alfa: base = VALOR SID (no valor asegurado inmueble).
  const va =
    c.valorAseguradoSid != null && c.valorAseguradoSid !== ''
      ? Number(c.valorAseguradoSid) || ''
      : '';
  /** Deducible según tomador (Bogotá/AV Villas/Popular: 2% VA + 2 SMMLV; Occidente: 1% pérdida). */
  const deducibleAlfa = patchDeducibleDesdeTomadorAlfa(c.tomador || '', {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    aplica: true,
    tipoMinimo: 'SMMLV',
  });
  return {
    valorAsegurado: va,
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: deducibleAlfa.texto,
    deducibleConfig: { ...deducibleAlfa },
    deducibleConfigPresupuesto: { ...deducibleAlfa },
  };
}

/**
 * Valor base para deducible / liquidación Alfa = VALOR SID.
 * No usar valor asegurado del inmueble (regla operativa).
 */
export function resolverValorSidParaLiquidacionAlfa(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  const liq = liquidador.liquidacionCatastrofico || {};
  const c = caso && typeof caso === 'object' ? caso : {};
  const sid =
    parsearNumero(enc.valorAseguradoSid) || parsearNumero(c.valorAseguradoSid);
  if (sid > 0) return sid;
  // Solo si aún no hay SID: copia de trabajo del liquidador (p. ej. mientras se digita).
  return parsearNumero(liq.valorAsegurado) || 0;
}

export function encabezadoDesdeCasoAlfa(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  return {
    tomador: c.tomador || '',
    asegurado: c.asegurado || c.informacionContacto || '',
    poliza: c.numeroPoliza || '',
    credito: c.numeroCredito || '',
    siniestro: c.siniestro || '',
    consecutivo: c.consecutivo || '',
    identificacion: c.identificacion || '',
    fechaSiniestro: fechaInput(c.fechaSiniestro),
    direccion: c.direccionPredio || '',
    ciudad: c.ciudad || '',
    departamento: c.departamento || '',
    cobertura: c.cobertura || '',
    evento: c.cobertura || 'TERREMOTO',
    causa: c.cobertura || '',
    ajustador: c.ajustador || '',
    valorAseguradoSid: c.valorAseguradoSid ?? '',
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
    valorAseguradoContenidos: c.valorAseguradoContenidos ?? '',
  };
}

/** Prefill portada NSR desde caso Alfa */
export function prefillNsrDesdeCasoAlfa(caso = {}, encabezado = {}) {
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

export const DEFAULT_LIQUIDADOR_ALFA = {
  modelo: 'nsr10',
  encabezado: {
    tomador: '',
    asegurado: '',
    poliza: '',
    credito: '',
    siniestro: '',
    consecutivo: '',
    identificacion: '',
    fechaSiniestro: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    cobertura: '',
    evento: 'TERREMOTO',
    causa: '',
    ajustador: '',
    valorAseguradoSid: '',
    valorAseguradoInmueble: '',
    valorAseguradoContenidos: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultAlfa(),
  /** Filas del FORMATO LIQUIDACIÓN. null = derivar del presupuesto NSR; [] o filas = edición manual. */
  detalleLiquidacionCat: null,
  indemnizacionSugerida: '',
  observaciones: '',
  /** ACEPTO | NO_ACEPTO — pie del FORMATO LIQUIDACIÓN */
  aceptacionIndemnizacion: '',
  /** Firma manuscrita del cliente (data URL PNG) */
  firmaCliente: '',
  nombreFirmante: '',
  /** Datos para el finiquito / pie del FORMATO LIQUIDACIÓN (Excel CAT). */
  datosBancarios: {
    numeroCuenta: '',
    banco: '',
    tipoCuenta: '',
    sucursal: '',
    ciudadFirma: '',
  },
  /**
   * Arriendo, retiro de escombros y similares.
   * Se liquidan aparte: sin deducible ni AIU. null = hidratar defaults al mapear.
   */
  otrosAmparos: null,
  /**
   * Cotizaciones PDF (materiales / mano de obra / completo).
   * Bloque independiente del formato NSR: tiene su propio tomador, deducible, SID y AIU.
   */
  cotizacionesPdf: { materiales: null, manoObra: null, completo: null },
  /** Alias del slot «completo» (compat con Zurich/Allianz). */
  cotizacionPdf: null,
  /** Encabezado / deducible / AIU solo de las cotizaciones PDF (no toca el formato NSR). */
  liquidacionCotizacionPdf: null,
};

export function esLiquidadorNsrAlfa(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Deducible Alfa según tomador:
 * - valor_asegurable: MAX(% del valor asegurado, N × SMMLV)
 * - perdida: % del valor de la pérdida (p. ej. Occidente 1%)
 */
export function calcularDeducibleAlfaSobreValorAsegurado({
  valorAsegurado = 0,
  totalDanios = 0,
  deducibleConfig = {},
  tomador = '',
} = {}) {
  const reglaTomador = resolverReglaDeducibleTomadorAlfa(tomador);
  const cfg = {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    porcentaje: reglaTomador.porcentaje,
    cantidadSMMLV: reglaTomador.cantidadSMMLV,
    baseDeducible: reglaTomador.base,
    tipoMinimo: 'SMMLV',
    aplica: true,
    texto: reglaTomador.texto,
    ...(deducibleConfig && typeof deducibleConfig === 'object' ? deducibleConfig : {}),
  };
  const base =
    cfg.baseDeducible === 'perdida' || cfg.baseDeducible === 'perdida_total'
      ? 'perdida'
      : 'valor_asegurable';
  const va = parsearNumero(valorAsegurado);
  const danios = parsearNumero(totalDanios);
  const porcentaje = Number(cfg.porcentaje);
  const pct = Number.isFinite(porcentaje) ? porcentaje : base === 'perdida' ? 1 : 2;
  const cantidadSMMLV = Number(cfg.cantidadSMMLV);
  const cant = Number.isFinite(cantidadSMMLV) ? cantidadSMMLV : base === 'perdida' ? 0 : 2;
  const anio = Number(cfg.anioSMMLV) || ANIOS_SMMLV[0] || 2026;
  const valorSMMLV =
    parsearNumero(cfg.valorSMMLV) || SMMLV_POR_ANIO[anio] || SMMLV_DEFAULT;
  const deducibleSMMLV =
    cant > 0 ? Math.round(cant * valorSMMLV * 100) / 100 : 0;

  // Occidente y similares: % de la pérdida
  if (base === 'perdida') {
    if (!danios) {
      return {
        aplica: false,
        requiereValorAsegurado: false,
        requierePerdida: true,
        baseDeducible: 'perdida',
        valorAsegurado: va,
        porcentaje: pct,
        cantidadSMMLV: cant,
        valorSMMLV,
        anioSMMLV: anio,
        deduciblePorcentaje: 0,
        deducibleSMMLV: 0,
        deducibleAplicado: 0,
        usaMinimo: false,
        texto: cfg.texto || `${pct}% del valor de la pérdida`,
        reglaTomador,
      };
    }
    const deduciblePorcentaje = Math.round(danios * (pct / 100) * 100) / 100;
    const bruto =
      deducibleSMMLV > 0
        ? Math.max(deduciblePorcentaje, deducibleSMMLV)
        : deduciblePorcentaje;
    const usaMinimo = deducibleSMMLV > 0 && deducibleSMMLV > deduciblePorcentaje;
    return {
      aplica: true,
      requiereValorAsegurado: false,
      requierePerdida: false,
      baseDeducible: 'perdida',
      valorAsegurado: va,
      porcentaje: pct,
      cantidadSMMLV: cant,
      valorSMMLV,
      anioSMMLV: anio,
      deduciblePorcentaje,
      deducibleSMMLV,
      deducibleAplicado: bruto,
      usaMinimo,
      texto:
        cfg.texto ||
        (cant > 0
          ? `${pct}% de la pérdida, mínimo ${cant} SMMLV`
          : `${pct}% del valor de la pérdida`),
      reglaTomador,
    };
  }

  // Bogotá / AV Villas / Popular: % valor asegurable + mínimo SMMLV
  if (!va) {
    return {
      aplica: false,
      requiereValorAsegurado: true,
      requierePerdida: false,
      baseDeducible: 'valor_asegurable',
      valorAsegurado: 0,
      porcentaje: pct,
      cantidadSMMLV: cant,
      valorSMMLV,
      anioSMMLV: anio,
      deduciblePorcentaje: 0,
      deducibleSMMLV,
      deducibleAplicado: 0,
      usaMinimo: false,
      texto: 'Indique el Valor SID para calcular el deducible',
      reglaTomador,
    };
  }

  const deduciblePorcentaje = Math.round(va * (pct / 100) * 100) / 100;
  const bruto = Math.max(deduciblePorcentaje, deducibleSMMLV);
  const usaMinimo = deducibleSMMLV > deduciblePorcentaje;
  // Mostrar siempre el deducible de póliza (mayor entre % SID y SMMLV).
  // No topear a la pérdida: si el deducible > daños, la indemnización queda en 0.
  const deducibleAplicado = Math.round(bruto * 100) / 100;

  return {
    aplica: true,
    requiereValorAsegurado: false,
    requierePerdida: false,
    baseDeducible: 'valor_asegurable',
    valorAsegurado: va,
    porcentaje: pct,
    cantidadSMMLV: cant,
    valorSMMLV,
    anioSMMLV: anio,
    deduciblePorcentaje,
    deducibleSMMLV,
    deducibleAplicado,
    usaMinimo,
    texto:
      cfg.texto ||
      `${pct}% del Valor SID · Mínimo ${cant} SMMLV (se aplica el mayor)`,
    reglaTomador,
  };
}

/**
 * Presupuesto Alfa: AIU 20% único; imprevistos/impuestos en 0 (el formato CAT no los muestra).
 * Migra defaults previos: NSR 5%+10% imprevistos, o AIU Alfa 15% → 20%.
 */
export function normalizarPresupuestoAiuAlfa(presupuesto = {}) {
  const p = presupuesto && typeof presupuesto === 'object' ? { ...presupuesto } : {};
  const aiu = Number(p.aiuPorcentaje);
  const impr = Number(p.imprevistosPorcentaje);
  const imp = Number(p.impuestosPorcentaje);
  const aiuVacio = p.aiuPorcentaje == null || !Number.isFinite(aiu);
  const imprVacio = p.imprevistosPorcentaje == null || !Number.isFinite(impr);
  const esDefaultNsr =
    (aiuVacio || Math.abs(aiu - 0.05) < 1e-9) &&
    (imprVacio || Math.abs(impr - 0.1) < 1e-9);
  const aiuLegacy15 =
    Number.isFinite(aiu) && Math.abs(aiu - AIU_PORCENTAJE_LEGACY_ALFA) < 1e-9;
  const aiuLegacyConImprevistos =
    aiuLegacy15 && Number.isFinite(impr) && Math.abs(impr - 0.1) < 1e-9;

  if (esDefaultNsr || aiuLegacy15 || aiuLegacyConImprevistos) {
    p.aiuPorcentaje = AIU_PORCENTAJE_DEFAULT_ALFA;
    p.imprevistosPorcentaje = IMPREVISTOS_PORCENTAJE_DEFAULT_ALFA;
    p.impuestosPorcentaje = Number.isFinite(imp) ? imp : IMPUESTOS_PORCENTAJE_DEFAULT_ALFA;
  } else {
    if (aiuVacio) p.aiuPorcentaje = AIU_PORCENTAJE_DEFAULT_ALFA;
    if (imprVacio) p.imprevistosPorcentaje = IMPREVISTOS_PORCENTAJE_DEFAULT_ALFA;
    if (p.impuestosPorcentaje == null || !Number.isFinite(imp)) {
      p.impuestosPorcentaje = IMPUESTOS_PORCENTAJE_DEFAULT_ALFA;
    }
  }
  return p;
}

export function aplicarPresupuestoAiuAlfaEnEvaluacion(evalData = {}) {
  const data = evalData && typeof evalData === 'object' ? evalData : {};
  return {
    ...data,
    presupuesto: normalizarPresupuestoAiuAlfa(data.presupuesto || {}),
  };
}

export function defaultLiquidacionCotizacionPdfAlfa() {
  const deducibleAlfa = patchDeducibleDesdeTomadorAlfa('', {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    aplica: true,
    tipoMinimo: 'SMMLV',
  });
  return {
    tomador: '',
    asegurado: '',
    poliza: '',
    valorAseguradoSid: '',
    aiuPorcentaje: AIU_PORCENTAJE_DEFAULT_ALFA,
    deducibleConfig: { ...deducibleAlfa },
  };
}

export function normalizarLiquidacionCotizacionPdfAlfa(guardado = {}) {
  const raw =
    guardado?.liquidacionCotizacionPdf && typeof guardado.liquidacionCotizacionPdf === 'object'
      ? guardado.liquidacionCotizacionPdf
      : {};
  const base = defaultLiquidacionCotizacionPdfAlfa();
  const cfg = {
    ...base.deducibleConfig,
    ...(raw.deducibleConfig && typeof raw.deducibleConfig === 'object' ? raw.deducibleConfig : {}),
    aplica: true,
  };
  const tomador = raw.tomador || '';
  return {
    ...base,
    ...raw,
    tomador,
    asegurado: raw.asegurado || '',
    poliza: raw.poliza || '',
    valorAseguradoSid: raw.valorAseguradoSid ?? '',
    aiuPorcentaje:
      Number.isFinite(Number(raw.aiuPorcentaje))
        ? Number(raw.aiuPorcentaje)
        : AIU_PORCENTAJE_DEFAULT_ALFA,
    deducibleConfig: tomador ? patchDeducibleDesdeTomadorAlfa(tomador, cfg, raw.poliza || '') : cfg,
  };
}

/**
 * Totales Alfa = ítems (costo directo) + AIU 20% − deducible + otros amparos.
 * Otros amparos (arriendo, retiro de escombros) van por aparte: sin deducible ni AIU.
 * No suma imprevistos/impuestos NSR ni hospedaje duplicado (si va en el detalle, ya está en el subtotal).
 *
 * opciones.forzarNsr: ignora cotizaciones PDF y liquida solo el formato de ítems.
 */
export function calcularLiquidacionAlfa(liquidador = {}, opciones = {}) {
  const forzarNsr = Boolean(opciones.forzarNsr) || opciones.modo === 'nsr';
  const forzarCotiz = opciones.modo === 'cotizacion';
  const evalDataRaw = liquidador.evaluacionSismicaNSR10 || {};
  const evalData = aplicarPresupuestoAiuAlfaEnEvaluacion(evalDataRaw);
  const presupuesto = evalData.presupuesto || { items: [] };
  const valoresAsegurablesCaso = valoresAsegurablesDesdeLiquidador(liquidador);
  const totalesPres = calcularTotalesPresupuesto(presupuesto, valoresAsegurablesCaso);
  const resumen = calcularResumenTotalesNsr10(evalData, valoresAsegurablesCaso);
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  const cotizLiq = normalizarLiquidacionCotizacionPdfAlfa(liquidador);
  const resumenCotiz = resumenCotizacionesPdfAlfa(liquidador);
  const usaCotiz = forzarCotiz || (!forzarNsr && resumenCotiz.usaComoBase);
  const tomadorCalculo = usaCotiz ? cotizLiq.tomador || '' : enc.tomador || '';
  const valorAsegurado = usaCotiz
    ? parsearNumero(cotizLiq.valorAseguradoSid)
    : resolverValorSidParaLiquidacionAlfa(liquidador);
  const cfgDedRaw = usaCotiz
    ? cotizLiq.deducibleConfig || {}
    : liq.deducibleConfigPresupuesto || liq.deducibleConfig || {};
  const cfgDed =
    cfgDedRaw.baseDeducible || !tomadorCalculo
      ? cfgDedRaw
      : patchDeducibleDesdeTomadorAlfa(
          tomadorCalculo,
          cfgDedRaw,
          usaCotiz ? cotizLiq.poliza : enc.poliza
        );

  // Detalle CAT (Formato liquidación): misma base que la UI (suma valorPerdida + AIU).
  // Si solo hay presupuesto NSR, se usa cantidad×VU (o total de fila).
  const detalle = Array.isArray(liquidador.detalleLiquidacionCat)
    ? liquidador.detalleLiquidacionCat
    : null;
  const subtotalDetalle = detalle
    ? detalle.reduce((acc, it) => acc + parsearNumero(it.valorPerdida), 0)
    : 0;
  const usarDetalle =
    Boolean(detalle) &&
    (subtotalDetalle > 0 ||
      detalle.some((it) => String(it?.descripcion || '').trim() || it?.catalogoId));

  const aiuPctAlfa = usaCotiz
    ? Number(cotizLiq.aiuPorcentaje ?? AIU_PORCENTAJE_DEFAULT_ALFA)
    : Number(presupuesto.aiuPorcentaje ?? AIU_PORCENTAJE_DEFAULT_ALFA);
  const montoCotiz = resumenCotiz.total;
  let subtotal;
  let aiu;
  let baseCat;
  let totalContenidos;
  let totalDaniosCat;

  if (usaCotiz) {
    subtotal = Math.round(montoCotiz * 100) / 100;
    aiu = Math.round(subtotal * aiuPctAlfa * 100) / 100;
    baseCat = Math.round((subtotal + aiu) * 100) / 100;
    totalContenidos = 0;
    totalDaniosCat = baseCat;
  } else if (usarDetalle) {
    subtotal = Math.round(subtotalDetalle * 100) / 100;
    aiu = Math.round(subtotal * aiuPctAlfa * 100) / 100;
    baseCat = Math.round((subtotal + aiu) * 100) / 100;
    // Contenidos / ítems ya van en el detalle CAT cuando está en modo manual.
    totalContenidos = 0;
    totalDaniosCat = baseCat;
  } else {
    subtotal = Number(totalesPres.subtotal || 0);
    aiu = Number(totalesPres.aiu || 0);
    baseCat = Math.round((subtotal + aiu) * 100) / 100;
    totalContenidos = Number(resumen.totalContenidos) || 0;
    totalDaniosCat = Math.round((baseCat + totalContenidos) * 100) / 100;
  }

  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado,
    totalDanios: totalDaniosCat,
    totalPresupuesto: baseCat,
    totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: cfgDed,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || cfgDed,
    deducibleConfigPresupuesto: cfgDed,
    ...argsDeduciblesPorArticuloDiagrama(liq, resumen),
  });

  const dedAlfa = calcularDeducibleAlfaSobreValorAsegurado({
    valorAsegurado,
    totalDanios: totalDaniosCat,
    deducibleConfig: cfgDed,
    tomador: tomadorCalculo,
  });

  // Hospedaje: solo ítem explícito o valor manual. Nunca el 1% automático del SID.
  const hospedajeYaEnItems = (detalle || presupuesto.items || []).some((it) =>
    esFilaHospedajeAlfa(it)
  );
  const hospedajeManual = parsearNumero(liq.hospedajeManual);
  const hospedaje = usaCotiz || hospedajeYaEnItems ? 0 : hospedajeManual;
  const otrosAmparos = Array.isArray(liquidador.otrosAmparos)
    ? liquidador.otrosAmparos
    : [];
  const totalOtrosAmparos = sumarOtrosAmparosAlfa(otrosAmparos);
  const indemnizacionPrincipal = Math.max(
    0,
    Math.round((totalDaniosCat - dedAlfa.deducibleAplicado + hospedaje) * 100) / 100
  );
  const totalIndemnizar = Math.max(
    0,
    Math.round((indemnizacionPrincipal + totalOtrosAmparos) * 100) / 100
  );

  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);

  return {
    modelo: 'nsr10',
    presupuesto: {
      ...totalesPres,
      subtotal,
      aiu,
      // Alinear aiuPct al % Alfa normalizado (por si el guardado traía 5%)
      aiuPct: aiuPctAlfa,
      imprPct: Number(presupuesto.imprevistosPorcentaje ?? 0),
      impPct: Number(presupuesto.impuestosPorcentaje ?? 0),
    },
    contenidos: resumen.contenidos,
    totalPresupuesto: baseCat,
    totalContenidos,
    sumaCompleta: totalDaniosCat,
    subtotal,
    aiu,
    imprevistos: 0,
    impuestos: Number(totalesPres.impuestos) || 0,
    totalDanios: totalDaniosCat,
    diagrama: {
      ...diagrama,
      gastosHospedaje: hospedajeYaEnItems
        ? (detalle || presupuesto.items || []).reduce(
            (acc, it) => acc + (esFilaHospedajeAlfa(it) ? parsearNumero(it.valorPerdida ?? it.total) : 0),
            0
          )
        : hospedaje,
      valorAsegurado,
      deducibleAplicado: dedAlfa.deducibleAplicado,
      sumaDeducibles: dedAlfa.deducibleAplicado,
      deduciblePorcentaje: dedAlfa.deduciblePorcentaje,
      deducibleSMMLV: dedAlfa.deducibleSMMLV,
      deducibleUsaMinimo: dedAlfa.usaMinimo,
      deducibleAplica: dedAlfa.aplica,
      deducible: dedAlfa.texto,
      totalIndemnizar,
    },
    criterio,
    deducibleAlfa: dedAlfa,
    totalIndemnizar,
    totalIndemnizable: totalIndemnizar,
    totalPerdida: totalDaniosCat,
    totalReclamado: elegirMontoSinInflarAlfa(liquidador.valorReclamadoCaso, totalDaniosCat),
    deducibleAplicado: dedAlfa.deducibleAplicado,
    deducibleRequiereValorAsegurado: Boolean(dedAlfa.requiereValorAsegurado),
    deducibleTexto: dedAlfa.texto,
    subtotalContenidos: totalContenidos,
    subtotalEdificios: baseCat,
    diferencia: 0,
    usaSMMLV: Boolean(dedAlfa.usaMinimo),
    otrosAmparos: filasOtrosAmparosActivosAlfa(otrosAmparos),
    totalOtrosAmparos,
    indemnizacionPrincipal,
    resumenOtrosAmparos: textoResumenOtrosAmparosAlfa(otrosAmparos),
    origenPresupuesto: usaCotiz ? 'cotizacion' : 'nsr10',
    cotizacionMonto: montoCotiz,
    cotizacionFilas: resumenCotiz.filas,
    cotizacionNUsadas: resumenCotiz.nUsadas,
  };
}

/**
 * Monto oficial a indemnizar (UI / Excel CAT / Finiquito / valorLiquidado).
 * Fórmula: (subtotal ítems + AIU) − deducible + otros amparos.
 * SIEMPRE recalcula desde el liquidador. Nunca confía en totales.totalIndemnizar
 * ni en valorLiquidado del caso (pueden quedar desfasados tras editar).
 */
export function resolverMontoIndemnizarAlfa(liquidador = {}, totalesDesfasados = null) {
  const totales = calcularLiquidacionAlfa(liquidador);
  const totalIndemnizar = Math.max(0, Number(totales.totalIndemnizar) || 0);
  const stale = Number(
    totalesDesfasados?.totalIndemnizar ?? totalesDesfasados?.totalIndemnizable
  );
  if (
    typeof console !== 'undefined' &&
    Number.isFinite(stale) &&
    stale > 0 &&
    Math.abs(stale - totalIndemnizar) > 1
  ) {
    console.warn('[Alfa] Ignorado totalIndemnizar desfasado; se usó recálculo', {
      stale,
      recalculado: totalIndemnizar,
    });
  }
  return { totales, totalIndemnizar };
}

/**
 * Reclamado / liquidado oficiales del liquidador (números, no texto con puntos).
 * Null si el liquidador está vacío.
 */
export function montosCasoDesdeLiquidadorAlfa(liquidador = {}) {
  if (scoreContenidoLiquidadorNsr(liquidador) === 0) return null;
  const { totales, totalIndemnizar } = resolverMontoIndemnizarAlfa(liquidador);
  const reclamado = elegirMontoSinInflarAlfa(totales.totalReclamado, totales.totalDanios);
  const liquidado = Number(totalIndemnizar);
  return {
    valorReclamado: pesosEnterosAlfa(reclamado),
    valorLiquidado: pesosEnterosAlfa(liquidado),
  };
}

/** Campos de control de liquidación (terremoto, deducible, coberturas adicionales, total a pagar). */
export function camposControlLiquidacionDesdeLiquidadorAlfa(liquidador = {}) {
  if (scoreContenidoLiquidadorNsr(liquidador) === 0) return null;
  const { totales, totalIndemnizar } = resolverMontoIndemnizarAlfa(liquidador);
  const hospedaje = Number(totales?.diagrama?.gastosHospedaje) || 0;
  return {
    liquidadoCoberturaTerremo: pesosEnterosAlfa(
      (Number(totales.totalDanios) || 0) + hospedaje
    ),
    deducibleTerremoto: pesosEnterosAlfa(totales.deducibleAplicado),
    valorLiquidacionCoberturasAdicionales: pesosEnterosAlfa(totales.totalOtrosAmparos),
    deducibleCoberturasAdicionales: 0,
    valorTotalPagar: pesosEnterosAlfa(totalIndemnizar),
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosAlfa(liquidador = {}) {
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

/** Construye filas del FORMATO LIQUIDACIÓN desde presupuesto NSR + hospedaje manual. */
export function detalleLiquidacionCatDesdePresupuesto(liquidador = {}, _totales = null) {
  const filas = [];
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (Array.isArray(items)) {
    items.forEach((it, idx) => {
      const desc = String(it.actividad || it.componente || '').trim();
      if (!desc && !it.catalogoId) return;
      const cantidad = it.cantidad ?? '';
      const valorUnitario = it.valorUnitario ?? '';
      const perdida =
        parsearNumero(it.total) ||
        parsearNumero(valorUnitario) * parsearNumero(cantidad);
      filas.push({
        id: it.id || `nsr-${idx}`,
        catalogoId: it.catalogoId || '',
        capitulo: it.capitulo || '',
        descripcion: desc,
        unidad: it.unidad || 'und',
        cantidad,
        valorUnitario,
        valorAsegurado: '',
        indiceVariable: 0,
        valorAseguradoFecha: '',
        valorAsegurable: '',
        valorPerdida: perdida || '',
        demerito: 0,
        valorReal: perdida || '',
      });
    });
  }
  const liq = liquidador.liquidacionCatastrofico || {};
  const hospedaje = parsearNumero(liq.hospedajeManual);
  if (hospedaje > 0 && !filas.some((it) => esFilaHospedajeAlfa(it))) {
    filas.push({
      id: 'hospedaje',
      catalogoId: '',
      capitulo: '',
      descripcion: 'Gastos de hospedaje / alojamiento temporal',
      unidad: 'glb',
      cantidad: 1,
      valorUnitario: hospedaje,
      valorAsegurado: '',
      indiceVariable: 0,
      valorAseguradoFecha: '',
      valorAsegurable: '',
      valorPerdida: hospedaje,
      demerito: 0,
      valorReal: hospedaje,
    });
  }
  return filas;
}

/**
 * Preferencia: si detalleLiquidacionCat es un array (modo manual, aunque tenga filas vacías), usarlo.
 * Si es null/undefined, derivar del presupuesto NSR.
 */
export function resolverDetalleLiquidacionCat(liquidador = {}, totales = null) {
  if (Array.isArray(liquidador?.detalleLiquidacionCat)) {
    return liquidador.detalleLiquidacionCat;
  }
  return detalleLiquidacionCatDesdePresupuesto(liquidador, totales);
}

export function nuevoItemDetalleLiquidacionCat() {
  return {
    id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    catalogoId: '',
    capitulo: '',
    descripcion: '',
    unidad: 'und',
    cantidad: 1,
    valorUnitario: '',
    valorAsegurado: '',
    indiceVariable: 0,
    valorAseguradoFecha: '',
    valorAsegurable: '',
    valorPerdida: '',
    demerito: 0,
    valorReal: '',
  };
}

/** Recalcula valorPerdida / valorReal desde cantidad × valorUnitario. */
export function recalcularTotalesFilaDetalleCat(fila = {}) {
  const cant = parsearNumero(fila.cantidad);
  const vu = parsearNumero(fila.valorUnitario);
  const total =
    fila.cantidad !== '' && fila.valorUnitario !== '' && (cant > 0 || vu > 0)
      ? Math.round(cant * vu * 100) / 100
      : parsearNumero(fila.valorPerdida);
  const conDecimales = (() => {
    if (total === '' || total == null || Number.isNaN(Number(total))) return '';
    const n = Number(total);
    const hasDec = Math.abs(n % 1) > 1e-9;
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: hasDec ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(n);
  })();
  return {
    ...fila,
    valorPerdida: conDecimales,
    valorReal: conDecimales === '' ? fila.valorReal ?? '' : conDecimales,
  };
}

/** Espeja el detalle CAT al presupuesto NSR-10 para mantener un solo origen de precios. */
export function sincronizarDetalleCatConPresupuestoNsr(liquidador = {}, filasDetalle = []) {
  const evalData = liquidador.evaluacionSismicaNSR10 || {};
  const presupuesto = evalData.presupuesto || {};
  const filas = (filasDetalle || []).map((it) => retagFilaHospedajeSiItemReal(it));
  const items = filas
    .filter((it) => String(it?.descripcion || '').trim() || it?.catalogoId)
    .map((it) => ({
      id: it.id,
      catalogoId: it.catalogoId || '',
      capitulo: it.capitulo || '',
      componente: '',
      actividad: it.descripcion || '',
      unidad: it.unidad || 'und',
      cantidad: it.cantidad ?? '',
      valorUnitario: it.valorUnitario ?? '',
      total: it.valorPerdida ?? '',
      prioridad: 'Medio',
      cubierto: '',
      observacion: '',
      fuente: it.catalogoId ? 'Base precios general' : '',
    }));
  return {
    ...liquidador,
    detalleLiquidacionCat: filas,
    evaluacionSismicaNSR10: {
      ...evalData,
      presupuesto: {
        ...presupuesto,
        items,
      },
    },
  };
}

export function mapCasoAlfaALiquidador(caso = {}) {
  const encabezado = encabezadoDesdeCasoAlfa(caso);
  const prefill = prefillNsrDesdeCasoAlfa(caso, encabezado);
  const evalInicial = aplicarPresupuestoAiuAlfaEnEvaluacion(
    fusionarEvaluacionSismicaNSR10Guardada({}, prefill)
  );
  const base = {
    ...DEFAULT_LIQUIDADOR_ALFA,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultAlfa(caso),
    detalleLiquidacionCat: null,
    otrosAmparos: defaultOtrosAmparosAlfa(),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrAlfa(guardado)) {
    return {
      ...base,
      encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
      observaciones: guardado.observaciones || '',
      aceptacionIndemnizacion: guardado.aceptacionIndemnizacion || '',
      firmaCliente: guardado.firmaCliente || '',
      nombreFirmante: guardado.nombreFirmante || '',
      datosBancarios: {
        ...base.datosBancarios,
        ...(guardado.datosBancarios || {}),
      },
      valorReclamadoCaso: guardado.valorReclamadoCaso || base.valorReclamadoCaso,
      otrosAmparos: Array.isArray(guardado.otrosAmparos)
        ? normalizarOtrosAmparosAlfa(guardado.otrosAmparos)
        : defaultOtrosAmparosAlfa(),
      cotizacionesPdf: normalizarCotizacionesPdfAlfa(guardado),
      cotizacionPdf: normalizarCotizacionesPdfAlfa(guardado).completo,
      liquidacionCotizacionPdf: normalizarLiquidacionCotizacionPdfAlfa(guardado),
    };
  }

  return {
    ...base,
    ...guardado,
    modelo: 'nsr10',
    encabezado: {
      ...base.encabezado,
      ...(guardado.encabezado || {}),
      causa: guardado.encabezado?.causa || guardado.encabezado?.cobertura || base.encabezado.cobertura,
    },
    evaluacionSismicaNSR10: aplicarPresupuestoAiuAlfaEnEvaluacion(
      fusionarEvaluacionSismicaNSR10Guardada(guardado.evaluacionSismicaNSR10, prefill)
    ),
    liquidacionCatastrofico: (() => {
      const liqG = guardado.liquidacionCatastrofico || {};
      const cfgPrev =
        liqG.deducibleConfigPresupuesto ||
        liqG.deducibleConfig ||
        {};
      // Migrar defaults genéricos (10% / 4 SMMLV) al esquema Alfa
      const migrarAlfa =
        Number(cfgPrev.porcentaje) === 10 && Number(cfgPrev.cantidadSMMLV) === 4;
      const tomador =
        guardado.encabezado?.tomador || encabezado.tomador || caso.tomador || '';
      const cfgMerged = {
        ...base.liquidacionCatastrofico.deducibleConfig,
        ...cfgPrev,
        ...(migrarAlfa ? { porcentaje: 2, cantidadSMMLV: 2, aplica: true } : {}),
        aplica: true,
      };
      // Al cargar, el deducible sigue la regla del tomador (Occidente = % pérdida, resto = % SID + SMMLV)
      const cfgAlfa = patchDeducibleDesdeTomadorAlfa(tomador, cfgMerged);
      // Base del deducible = VALOR SID (prioriza SID sobre valorAsegurado histórico del liq).
      const sid =
        guardado.encabezado?.valorAseguradoSid ??
        encabezado.valorAseguradoSid ??
        caso.valorAseguradoSid;
      const sidNum = sid != null && sid !== '' ? Number(sid) || sid : '';
      const va =
        sidNum !== '' && sidNum != null
          ? sidNum
          : liqG.valorAsegurado ?? base.liquidacionCatastrofico.valorAsegurado;
      return {
        ...base.liquidacionCatastrofico,
        ...liqG,
        valorAsegurado: va,
        deducibleConfig: cfgAlfa,
        deducibleConfigPresupuesto: cfgAlfa,
        deducible: cfgAlfa.texto,
      };
    })(),
    detalleLiquidacionCat: Array.isArray(guardado.detalleLiquidacionCat)
      ? guardado.detalleLiquidacionCat
      : null,
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
    datosBancarios: {
      ...base.datosBancarios,
      ...(guardado.datosBancarios || {}),
    },
    otrosAmparos: Array.isArray(guardado.otrosAmparos)
      ? normalizarOtrosAmparosAlfa(guardado.otrosAmparos)
      : defaultOtrosAmparosAlfa(),
    cotizacionesPdf: normalizarCotizacionesPdfAlfa(guardado),
    cotizacionPdf: normalizarCotizacionesPdfAlfa(guardado).completo,
    liquidacionCotizacionPdf: normalizarLiquidacionCotizacionPdfAlfa(guardado),
  };
}

/** Quita File/blob de las cotizaciones PDF antes de guardar en Mongo. */
export function liquidadorAlfaParaPersistir(liquidador = {}) {
  const serializadas = serializarCotizacionesPdfAlfa(
    liquidador?.cotizacionesPdf,
    liquidador
  );
  return {
    ...liquidador,
    cotizacionesPdf: serializadas,
    cotizacionPdf: serializadas.completo,
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorAlfa(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdeCasoAlfa(caso, enc),
    ...camposValorAseguradoParaNsr(caso, enc),
    evaluacionSismicaNSR10: liquidador.evaluacionSismicaNSR10,
    liquidacionCatastrofico: liquidador.liquidacionCatastrofico,
    indemnizacionSugerida: liquidador.indemnizacionSugerida,
    asegurado: enc.asegurado,
    ciudad: enc.ciudad,
    direccionRiesgo: enc.direccion,
    numeroPoliza: enc.poliza,
    fechaSiniestro: enc.fechaSiniestro,
    actaAjustadorNombre: enc.ajustador || caso.ajustador || '',
  };
}

/** Bloque ANALISIS COBERTURA CRITERIA (hoja ANALISIS GENERAL del Excel CAT Alfa). */
export function defaultAnalisisGeneralInformeAlfa(caso = {}, informeParcial = {}) {
  const guardado =
    informeParcial?.analisisGeneral && typeof informeParcial.analisisGeneral === 'object'
      ? informeParcial.analisisGeneral
      : {};
  const ubicacion =
    [caso.direccionPredio, caso.ciudad, caso.departamento].filter(Boolean).join(', ') ||
    informeParcial.direccionRiesgo ||
    '';
  return {
    ubicacionEvento: guardado.ubicacionEvento || ubicacion,
    coaseguro: guardado.coaseguro || 'N/A',
    descripcionEvento:
      guardado.descripcionEvento ||
      informeParcial.infoEvento ||
      informeParcial.descripcionDanios ||
      '',
    causaEvento: guardado.causaEvento || caso.cobertura || '',
    fechaAsignacion: guardado.fechaAsignacion || fechaInput(caso.fechaAsignacion || caso.fechaInspeccion),
    fechaUltimoDocumento:
      guardado.fechaUltimoDocumento || fechaInput(caso.fechaUltimoDocumento),
    aplicacionExclusiones: guardado.aplicacionExclusiones || 'No aplica',
    cumplimientoGarantias: guardado.cumplimientoGarantias || 'Cumple',
    salvamento: guardado.salvamento || 'No aplica',
    indicadoresFraude:
      guardado.indicadoresFraude && typeof guardado.indicadoresFraude === 'object'
        ? guardado.indicadoresFraude
        : {},
    posibilidadRecobro: guardado.posibilidadRecobro || 'No aplica',
    observaciones:
      guardado.observaciones ||
      [informeParcial.conclusiones, informeParcial.recomendacion].filter(Boolean).join('\n\n') ||
      '',
  };
}

export function defaultInformeUnicoAlfa(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const coordsCaso =
    caso.ubicacionPredio?.lat != null && caso.ubicacionPredio?.lng != null
      ? `${caso.ubicacionPredio.lat}, ${caso.ubicacionPredio.lng}`
      : '';
  const base = {
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_ALFA,
    descripcionDanios: '',
    coordenadasRiesgo: coordsCaso,
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    analisisGeneral: defaultAnalisisGeneralInformeAlfa(caso, {}),
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: [],
    actaAjustadorNombre: caso.ajustador || '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    firmaAjustador: '',
  };
  if (!guardado) {
    return {
      ...base,
      fotosInspeccion: fotosInformeDesdeCaso(caso, base),
      analisisGeneral: defaultAnalisisGeneralInformeAlfa(caso, base),
    };
  }
  const merged = {
    ...base,
    ...guardado,
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo || coordsCaso,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    actaAjustadorFirmaImagen:
      guardado.actaAjustadorFirmaImagen || guardado.firmaAjustador || '',
    firmaAjustador:
      guardado.firmaAjustador || guardado.actaAjustadorFirmaImagen || '',
  };
  merged.analisisGeneral = defaultAnalisisGeneralInformeAlfa(caso, merged);
  return merged;
}

/**
 * Evita el desfase UTC de `new Date('YYYY-MM-DD')` (en CO suele restar un día).
 * Fechas solo-día → mediodía local.
 */
export function parseFechaLocalAlfa(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function formatDateLarga(value) {
  if (!value) return '—';
  try {
    const date = parseFechaLocalAlfa(value);
    if (!date) return String(value);
    return formatDate(date, getAppLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

/** Fecha del sismo CAT Alfa (texto fijo en Finiquito / cartas). */
export const FECHA_TERREMOTO_ALFA_LARGA = '10 de agosto de 2026';
