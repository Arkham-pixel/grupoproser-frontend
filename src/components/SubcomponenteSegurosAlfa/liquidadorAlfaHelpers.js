import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './segurosAlfaHelpers.js';
import {
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
import {
  patchDeducibleDesdeTomadorAlfa,
  resolverReglaDeducibleTomadorAlfa,
} from './tomadoresAlfaCatalogo.js';

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function liquidacionCatastroficoDefaultAlfa(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
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
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
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
    valorAseguradoInmueble: '',
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
      deducibleSMMLV: 0,
      deducibleAplicado: deduciblePorcentaje,
      usaMinimo: false,
      texto: cfg.texto || `${pct}% del valor de la pérdida`,
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
      texto: 'Indique el valor asegurado para calcular el deducible',
      reglaTomador,
    };
  }

  const deduciblePorcentaje = Math.round(va * (pct / 100) * 100) / 100;
  const bruto = Math.max(deduciblePorcentaje, deducibleSMMLV);
  const usaMinimo = deducibleSMMLV > deduciblePorcentaje;
  const deducibleAplicado =
    danios > 0
      ? Math.round(Math.min(bruto, danios) * 100) / 100
      : Math.round(bruto * 100) / 100;

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
      `${pct}% del valor asegurado · Mínimo ${cant} SMMLV (se aplica el mayor)`,
    reglaTomador,
  };
}

/**
 * Totales Alfa = presupuesto NSR-10 + contenidos + hospedaje.
 * Deducible según tomador (valor asegurable + SMMLV, o % de la pérdida).
 */
export function calcularLiquidacionAlfa(liquidador = {}) {
  const evalData = liquidador.evaluacionSismicaNSR10 || {};
  const presupuesto = evalData.presupuesto || { items: [] };
  const totalesPres = calcularTotalesPresupuesto(presupuesto);
  const resumen = calcularResumenTotalesNsr10(evalData);
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  const valorAsegurado =
    parsearNumero(liq.valorAsegurado) ||
    parsearNumero(enc.valorAseguradoInmueble) ||
    0;
  const cfgDedRaw = liq.deducibleConfigPresupuesto || liq.deducibleConfig || {};
  // Si falta baseDeducible, completar desde el tomador actual
  const cfgDed =
    cfgDedRaw.baseDeducible || !enc.tomador
      ? cfgDedRaw
      : patchDeducibleDesdeTomadorAlfa(enc.tomador, cfgDedRaw);

  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado,
    totalDanios: resumen.sumaCompleta,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: cfgDed,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || cfgDed,
    deducibleConfigPresupuesto: cfgDed,
  });

  const dedAlfa = calcularDeducibleAlfaSobreValorAsegurado({
    valorAsegurado,
    totalDanios: resumen.sumaCompleta,
    deducibleConfig: cfgDed,
    tomador: enc.tomador || '',
  });

  const hospedaje = parsearNumero(diagrama.gastosHospedaje);
  const totalIndemnizar = Math.max(
    0,
    Math.round((resumen.sumaCompleta - dedAlfa.deducibleAplicado + hospedaje) * 100) / 100
  );

  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta: resumen.sumaCompleta,
    subtotal: totalesPres.subtotal,
    aiu: totalesPres.aiu,
    imprevistos: totalesPres.imprevistos,
    impuestos: totalesPres.impuestos,
    totalDanios: resumen.sumaCompleta,
    diagrama: {
      ...diagrama,
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
    totalPerdida: resumen.sumaCompleta,
    totalReclamado: parsearNumero(liquidador.valorReclamadoCaso) || resumen.sumaCompleta,
    deducibleAplicado: dedAlfa.deducibleAplicado,
    deducibleRequiereValorAsegurado: Boolean(dedAlfa.requiereValorAsegurado),
    deducibleTexto: dedAlfa.texto,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: resumen.totalPresupuesto,
    diferencia: 0,
    usaSMMLV: Boolean(dedAlfa.usaMinimo),
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

/** Construye filas del FORMATO LIQUIDACIÓN desde presupuesto NSR + hospedaje. */
export function detalleLiquidacionCatDesdePresupuesto(liquidador = {}, totales = null) {
  const tot = totales || calcularLiquidacionAlfa(liquidador);
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
  const hospedaje = parsearNumero(tot?.diagrama?.gastosHospedaje);
  if (hospedaje > 0) {
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
  const items = (filasDetalle || [])
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
    detalleLiquidacionCat: filasDetalle,
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
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill);
  const base = {
    ...DEFAULT_LIQUIDADOR_ALFA,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultAlfa(caso),
    detalleLiquidacionCat: null,
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
    evaluacionSismicaNSR10: fusionarEvaluacionSismicaNSR10Guardada(
      guardado.evaluacionSismicaNSR10,
      prefill
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
      // Al cargar, el deducible sigue la regla del tomador (Occidente = % pérdida, resto = % VA + SMMLV)
      const cfgAlfa = patchDeducibleDesdeTomadorAlfa(tomador, cfgMerged);
      const va =
        liqG.valorAsegurado ??
        guardado.encabezado?.valorAseguradoInmueble ??
        encabezado.valorAseguradoInmueble ??
        base.liquidacionCatastrofico.valorAsegurado;
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
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorAlfa(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdeCasoAlfa(caso, enc),
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
    fotosInspeccion: Array.isArray(guardado.fotosInspeccion)
      ? guardado.fotosInspeccion
      : base.fotosInspeccion,
  };
  merged.analisisGeneral = defaultAnalisisGeneralInformeAlfa(caso, merged);
  return merged;
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
